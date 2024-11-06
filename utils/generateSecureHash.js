import crypto from 'crypto'

const generateSecureHash = (params, integritySalt) => {
    console.log(params)
    const sortedParams = Object.keys(params)
        .filter((key) => params[key])
        .sort()
        .map((key) => params[key])
        .join('&')

    console.log({ sortedParams })

    const stringToHash = `${integritySalt}&${sortedParams}`

    console.log({ stringToHash })

    const secureHash = crypto
        .createHmac('sha256', integritySalt)
        .update(stringToHash)
        .digest('hex')
        .toUpperCase()

    return secureHash
}

// const generateSecureHash = (params, integritySalt) => {
//     // Sort the keys alphabetically and map to 'key=value' pairs
//     const sortedParams = Object.keys(params)
//         .sort()
//         .map((key) => `${key}=${params[key]}`)
//         .join('&')

//     console.log('Concatenated string:', sortedParams)

//     // Create the final string to hash by appending the integrity salt at the beginning
//     const stringToHash = `${integritySalt}&${sortedParams}`

//     // Generate the HMAC-SHA256 hash
//     return crypto
//         .createHmac('sha256', integritySalt)
//         .update(stringToHash)
//         .digest('hex')
//         .toUpperCase()
// }

// {
//   pp_BillReference: 'billRef2343',
//   pp_Amount: 1000000,
//   pp_Description: 'card wallet desc',
//   pp_Language: 'EN',
//   pp_MerchantID: 'MC133533',
//   pp_SubMerchantID: '',
//   pp_Password: '8a03t83etu',
//   pp_Version: '1.1',
//   pp_TxnCurrency: 'PKR',
//   pp_TxnDateTime: '20241106131240',
//   pp_TxnRefNumber: 'T20241106131240801',
//   pp_TxnType: 'MPAY',
//   pp_TxnExpiryDateTime: '20241109131240',
//   pp_ReturnURL: 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform',
//   pp_BankId: '',
//   pp_ProductId: '',
//   ppmpf_1: '',
//   ppmpf_2: '',
//   ppmpf_3: '',
//   ppmpf_4: '',
//   ppmpf_5: '',
//   pp_SecureHash: '5D6C8CA623A1CE7A1E68632683F1879B4C520A3BD9716B6BF78CC7B5D6F191D6'
// }
export default generateSecureHash
