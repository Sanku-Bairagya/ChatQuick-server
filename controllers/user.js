import { compare } from "bcrypt";
import { User } from "../models/user.js";
import { cookieOption, emitEvent, sendToken, uploadFilesCloudinary } from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { Chat } from "../models/chat.js";
import {getOtherMember} from  "../lib/helper.js"



// create a new user and save it to the database and save token in cookie
const newUser = TryCatch(async (req,res,next) => {

    const {name,username,bio,password} = req.body;

    const file = req.file || [];
    
    if(!file) return next(new ErrorHandler("Please upload avatar",400))
    

    const result = await uploadFilesCloudinary([file])
    
    const avatar = {
        public_id:result[0].public_id,
        url:result[0].url
    }

    // const avatar ={
    //     public_id:"result[0].public_id",
    //     url:"result[0].url"
    // }

    const user = await User.create({
        name,
        username,
        bio,
        password,
        avatar
    })

    sendToken(res,user,200,"user created");

    
}
)
//login and save info to cookies
const login = TryCatch(async (req, res,next) => {
     
    const {username,password} = req.body;
  
    const user  = await User.findOne({ username }).select("+password");

    if(!user){
        return next(new ErrorHandler("Invalid username or Password",404));        
    }
    else{
        const isMatchedPassword = await compare(password,user.password);

        if( !isMatchedPassword ){
            return next(new ErrorHandler("Invalid username or password",404));
        }
        else{
            sendToken(res,user,200,`Welcome back ${user.name} 🤩 `);
        } 
    }

})

const getMyProfile = TryCatch( async (req,res) => {

    const user = await User.findById(req.user)

    res.status(200).json(
        {
            success:true,
            user
        })
})


const logOut = TryCatch(async(req,res)=>{
    return res.status(200)
    .cookie("chatQuick","",{...cookieOption,maxAge:0})
    .json({
        success:true,
        message:"User logged out !"
    })
})

const search = async (req,res) => {
    const {name}  = req.query;

    //finding all my chats
    const myChats = await User.find({
        groupChat:false,
        members:req.user
    });

    //extracting All users from my chats or people I have chatted with
    const allUsersFromMyChats = myChats.map((chat) => chat.members)
    .flat().
    filter((member) => member.toString() !== req.user.toString());

    

    //find the users except me and my frinds
    const allUsersExceptMeAndFriends = await User.find({
        _id:{$nin:[...allUsersFromMyChats,req.user]},
        name:{$regex: name,$options:"i"}
    })

    //modyfying response
    const users =   allUsersExceptMeAndFriends.map(({_id,name,avatar})=>({
        _id,
        name,
        avatar:avatar.url
    }))
    res.status(200).json({
        success:true,
        users
    })
}


const sendFrindRequest = TryCatch(async(req,res,next)=>{

    const {userId} = req.body;

    const request = await Request.findOne({
        $or:[
            {sender:req.user,receiver:userId},
            {sender:userId,receiver:req.user},
        ]
    });

    if(request) return next(new ErrorHandler("Request is already sent",400))

    await Request.create({
        sender:req.user,
        receiver:userId
    })

    emitEvent(req,NEW_REQUEST,[userId])

    return res.status(200)
    .json({
        success:true,
        message:"Friend Request Sent"
    })
})

const acceptFrindRequest = TryCatch(async(req,res,next)=>{
   
    const {requestId,accept}  = req.body;
   
    const request = await Request.findById(requestId)
    .populate("sender","name")
    .populate("receiver","name");

    if(!request) return next(new ErrorHandler("Request not found",404));

    if(request.receiver._id.toString() !== req.user.toString())
        return next(new ErrorHandler("You are not authorized to accept this request",401))

    if(!accept){
        await request.deleteOne();

        return res.status(200).json({
            success:true,
            message:"Friend request rejected"
        })
    }

    const members = [request.sender._id,request.receiver._id]

    await Promise.all([Chat.create({ 
        members,
        name:`${request.sender.name}-${request.receiver.name}`,
     }),
     console.log("Chat created"),
     request.deleteOne(),
    ])

    emitEvent(req,REFETCH_CHATS,members);

    return res.status(200)
    .json({
        success:true,
        message:"Request accepted !",
        senderId:request.sender._id
    })
})

const getAllNotification = TryCatch(async(req,res)=>{

    const request = await Request.find({receiver:req.user}).populate(
        "sender",
        "name avatar"
    )

    const allRequests = request.map(({_id,sender})=>({
        _id,
        sender:{
            _id:sender._id,
            name:sender.name,
            avatar:sender.avatar.url
        }
    }))

    return res.status(200).json({
        success:true,
        allRequests
    })

})

const getMyFriends = TryCatch(async(req,res)=>{

    const chatId = req.query.chatId;

    const chats = await Chat.find({
        members: req.user,
        groupchat:false
    }).populate("members","name avatar");
    
    //console.log("user(controller) js->",chats);
    
    const friends = chats.map(({members})=>{
       
        const otherUser = getOtherMember(members,req.user)

        return {
            _id:otherUser._id,
            name:otherUser.name,
            avatar:otherUser.avatar.url
        }
        
    })


    if(chatId){
        const chat = await Chat.findById(chatId);

        const availableFriends = friends.filter(
            (friend) => !chat.members.includes(friend._id)
        );

        return res.status (200).json({
            success:true,
            friends:availableFriends
        })
    }
        
    else{
        return res.status (200).json({
            success:true,
            friends
        })
    }
    
})






export {login,newUser,getMyProfile,logOut,search,sendFrindRequest,acceptFrindRequest,getAllNotification,getMyFriends};