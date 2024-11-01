import slugify from "slugify";
import redisClient from "../config/redisConfig.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { getCacheKey } from "../utils/helpers.js";
import mongoose from "mongoose";

// Check Document fields if they exisit it return data body
// And if not it return Error
export const checkFields = (Model, req, next) => {
  const allowedFields = Object.keys(Model.schema.paths);
  const extraFields = Object.keys(req.body).filter(
    (field) => !allowedFields.includes(field)
  );

  // Add custom handling for allowed fields
  const customAllowedFields = ["userLimit"]; 

  // Check if extra fields are allowed
  const invalidFields = extraFields.filter(
    (field) => !customAllowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return next(
      new AppError(
        `These fields are not allowed: ${invalidFields.join(", ")}`,
        400
      )
    );
  }

  const filteredData = Object.keys(req.body).reduce((obj, key) => {
    if (allowedFields.includes(key) || customAllowedFields.includes(key)) {
      obj[key] = req.body[key];
    }
    return obj;
  }, {});

  return { allowedFields, filteredData };
};

// DELETE One Document
export const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id).exec();

    const docName = Model.modelName.toLowerCase() || "Document";

    // Handle case where the document was not found
    if (!doc) {
      return next(new AppError(`No ${docName} found with that ID`, 404));
    }

    // get single document store in cache
    const cacheKeyOne = getCacheKey(Model.modelName, req.params.id);
    await redisClient.del(cacheKeyOne);

    // delete document caches
    const cacheKey = getCacheKey(Model.modelName, "", req.query);
    await redisClient.del(cacheKey);

    res.status(204).json({
      status: "success",
      doc: null,
    });
  });

// UPDATE One Document
export const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    let { allowedFields, filteredData } = checkFields(Model, req, next);

    // if document contain slug then create a slug
    if (allowedFields.includes("slug") && filteredData.name) {
      filteredData = {
        ...filteredData,
        slug: slugify(filteredData.name, { lower: true }),
      };
    }

    // Perform the update operation
    const doc = await Model.findByIdAndUpdate(req.params.id, filteredData, {
      new: true,
      runValidators: true,
    });

    const docName = Model?.modelName?.toLowerCase() || "Document";

    // Handle case where the document was not found
    if (!doc) {
      return next(new AppError(`No ${docName} found with that ID`, 404));
    }

        const cacheKeyOne = getCacheKey(Model.modelName, filteredData.slug)


    // delete pervious document data
    await redisClient.del(cacheKeyOne);
    // updated the cache with new data
    await redisClient.setEx(cacheKeyOne, 3600, JSON.stringify(doc));

    // Update cache
    const cacheKey = getCacheKey(Model.modelName, "", req.query);
    await redisClient.del(cacheKey);

    res.status(200).json({
      status: "success",
      doc,
    });
  });

// CREATE One Document
export const createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    let { allowedFields, filteredData } = checkFields(Model, req, next);

    // if document contain slug then create a slug
    if (allowedFields.includes("slug")) {
      filteredData = {
        ...filteredData,
        slug: slugify(filteredData.name, { lower: true }),
      };
    }

    const doc = await Model.create(filteredData);

    const docName = Model.modelName || "Document";

    if (!doc) {
      return next(new AppError(`${docName} could not be created`, 400));
    }

    if (
      Model.modelName === "SubCategory" ||
      Model.modelName === "SubSubCategory"
    ) {
      const modelCache = getCacheKey("Category", "");
      await redisClient.del(modelCache);
    }

    const cacheKeyOne = getCacheKey(Model.modelName, doc?._id);
    await redisClient.setEx(cacheKeyOne, 3600, JSON.stringify(doc));

    // delete all documents caches related to this model
    const cacheKey = getCacheKey(Model.modelName, "", req.query);
    await redisClient.del(cacheKey);

    res.status(201).json({
      status: "success",
      doc,
    });
  });

// GET One Document
export const getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey(Model.modelName, req.params.id);

    // Check cache first
    const cachedDoc = await redisClient.get(cacheKey);

    if (cachedDoc) {
      return res.status(200).json({
        status: "success",
        cached: true,
        doc: JSON.parse(cachedDoc),
      });
    }

    // If not in cache, fetch from database
    let query = Model.findById(req.params.id);

    if (popOptions && popOptions.path) query = query.populate(popOptions);
    const doc = await query;

    const docName = Model.modelName.toLowerCase() || "Document";

    if (!doc) {
      return next(new AppError(`No ${docName} found with that ID`, 404));
    }

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(doc));

    res.status(200).json({
      status: "success",
      cached: false,
      doc,
    });
  });

// GET All Documents
export const getAll = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey(Model.modelName, "", req.query);

    // Check cache first
    const cacheddoc = await redisClient.get(cacheKey);

    if (cacheddoc !== null) {
      return res.status(200).json({
        status: "success",
        cached: true,
        results: JSON.parse(cacheddoc).length,
        doc: JSON.parse(cacheddoc),
      });
    }

    // EXECUTE QUERY
    let query = Model.find();

    // If popOptions is provided and path is an array or a string, populate the query
    if (popOptions?.path) {
      if (Array.isArray(popOptions.path)) {
        popOptions.path.forEach((pathOption) => {
          query = query.populate(pathOption);
        });
      } else {
        query = query.populate(popOptions);
      }
    }
    // If not in cache, fetch from database

    const features = new APIFeatures(query, req.query)
      .filter()
      .sort()
      .fieldsLimit()
      .paginate();

    const doc = await features.query;

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(doc));

    res.status(200).json({
      status: "success",
      cached: false,
      results: doc.length,
      doc,
    });
  });

export const getOneBySlug = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const cacheKey = getCacheKey(Model.modelName, req.params.slug);

    // Check cache first
    const cachedDoc = await redisClient.get(cacheKey);

    if (cachedDoc) {
      return res.status(200).json({
        status: "success",
        cached: true,
        doc: JSON.parse(cachedDoc),
      });
    }

    // If not in cache, fetch from database
    let query = Model.findOne({ slug: req.params.slug });

    if (popOptions && popOptions?.path) query = query.populate(popOptions);
    const doc = await query;

    const docName = Model.modelName.toLowerCase() || "Document";

    if (!doc) {
      return next(new AppError(`No ${docName} found with that slug`, 404));
    }

    // Cache the result
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(doc));

    res.status(200).json({
      status: "success",
      cached: false,
      doc,
    });
  });

export const deleteOneWithTransaction = (Model, relatedModels = []) =>
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const doc = await Model.findById(req.params.id).session(session);

      if (!doc) {
        await session.abortTransaction();
        return next(
          new AppError(
            `No ${Model.modelName.toLowerCase()} found with that ID`,
            404
          )
        );
      }

      const cacheKeys = [];

      for (const relatedModel of relatedModels) {
        const { model, foreignKey } = relatedModel;

        const relatedDocs = await model
          .find({ [foreignKey]: req.params.id })
          .session(session);
        if (relatedDocs.length > 0) {
          await model
            .deleteMany({ [foreignKey]: req.params.id })
            .session(session);
        }

        const cacheKey = getCacheKey(model.modelName.toString(), "");
        cacheKeys.push(cacheKey);
      }

      await doc.deleteOne({ session });

      cacheKeys.push(getCacheKey(Model.modelName, req.params.id));
      cacheKeys.push(getCacheKey(Model.modelName, "", req.query));

      await Promise.all([
        session.commitTransaction(),
        redisClient.del(...cacheKeys),
      ]);

      session.endSession();

      res.status(204).json({ status: "success", doc: null });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Something went wrong during deletion", 500));
    }
  });

// UPDATE Status of Document
export const updateStatus = (Model) =>
  catchAsync(async (req, res, next) => {
    if (!req.body.status) {
      return next(new AppError(`Please provide status value.`, 400));
    }

    // Perform the update operation
    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      {
        new: true,
        runValidators: true,
      }
    );

    const docName = Model.modelName.toLowerCase() || "Document";

    // Handle case where the document was not found
    if (!doc) {
      return next(new AppError(`No ${docName} found with that ID`, 404));
    }

    const cacheKeyOne = getCacheKey(Model.modelName, req.params.id);

    // delete pervious document data
    await redisClient.del(cacheKeyOne);
    // updated the cache with new data
    await redisClient.setEx(cacheKeyOne, 3600, JSON.stringify(doc));

    // Update cache
    const cacheKey = getCacheKey(Model.modelName, "", req.query);
    await redisClient.del(cacheKey);

    res.status(200).json({
      status: "success",
      doc,
    });
  });

// UPDATE Publish Status of Document
export const updatePublishStatus = (Model) =>
  catchAsync(async (req, res, next) => {
    if (!req.body.published) {
      return next(new AppError(`Please provide publish status value.`, 400));
    }

    // Perform the update operation
    const doc = await Model.findByIdAndUpdate(req.params.id, publish, {
      new: true,
      runValidators: true,
    });

    const docName = Model.modelName.toLowerCase() || "Document";

    // Handle case where the document was not found
    if (!doc) {
      return next(new AppError(`No ${docName} found with that ID`, 404));
    }

    const cacheKeyOne = getCacheKey(Model.modelName, req.params.id);

    // delete pervious document data
    await redisClient.del(cacheKeyOne);
    // updated the cache with new data
    await redisClient.setEx(cacheKeyOne, 3600, JSON.stringify(doc));

    // Update cache
    const cacheKey = getCacheKey(Model.modelName, "", req.query);
    await redisClient.del(cacheKey);

    res.status(200).json({
      status: "success",
      doc,
    });
  });

export const cleanCache = catchAsync(async (req, res, next) => {
  try {
    await redisClient.flushAll();
    res.status(200).json({
      status: "success",
      message: "Redis cache cleaned.",
    });
  } catch (err) {
    return next(new AppError("Redis cache not cleaned", 400));
  }
});
