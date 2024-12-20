import { body, param, validationResult } from 'express-validator';
import { ErrorHandler } from '../utils/utility.js';

const registerValidator = () => [
    body("name","Please Enter Name").notEmpty(),
    body("username","Please Enter Username").notEmpty(),
    body("bio","Please Enter Bio").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
    
] ;

const loginValidator = () => [
    body("username","Please Enter Username").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
]

const newGroupValidator = () => [
    body("name","Please Enter Name").notEmpty(),
    body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({min:2,max:100})
    .withMessage("Members nust be between 2-100"),
]

const addMemberValidator = () => [
    body("chatId","Please enter chat ID").notEmpty(),
    body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({min:1,max:97})
    .withMessage("Members nust be between 1-97")
]

const removeMemberValidator = () => [
    body("chatId","Please enter chat ID").notEmpty(),
    body("userId","Please enter User ID").notEmpty(),
]

const leaveGroupValidator = () => [
    param("id","Please enter chat ID").notEmpty(),
    
]

const sendAttachmentsValidator = () => [
    body("chatId","Please enter chat ID").notEmpty(),
    
]

const getMessagesValidator = () => [
    param("id","Please Enter Chat Id").notEmpty(),

]

const getChatDetailsValidator = () => [
    param("id","Please Enter Chat Id").notEmpty(),

]

const renameGroupValidator = () => [
    param("id","Please Enter Chat Id").notEmpty(),
    body("name","Please Enter new Name").notEmpty(),
]
const sendRequestValidator = () => [
    
    body("userId","Please Enter User Id").notEmpty(),
]

const acceptrequestValidator = () => [
    
    body("requestId","Please Enter Request Id").notEmpty(),
    body("accept","Please Add accept")
    .notEmpty()
    .isBoolean()
    .withMessage("Accept must be boolean"),

]

const validateHandler = (req,res,next) => {
    const errors = validationResult(req);

    const errorMessages = errors.array().map((error)=>error.msg).join(", ");


    if(errors.isEmpty()) return next();
    else next(new ErrorHandler(errorMessages,400));
    
}

const adminLoginValidator = () => [
    body("secretKey","Please Enter secret key ").notEmpty(),
]



export {
    acceptrequestValidator, addMemberValidator, adminLoginValidator, getChatDetailsValidator, getMessagesValidator, leaveGroupValidator, loginValidator,
    newGroupValidator, registerValidator, removeMemberValidator, renameGroupValidator, sendAttachmentsValidator, sendRequestValidator, validateHandler
};
