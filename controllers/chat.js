import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { deleteFilesCloudinary, emitEvent, uploadFilesCloudinary } from "../utils/features.js";
import { ALERT,  NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { User } from "../models/user.js";
import {Message} from "../models/message.js"

const newGroupChat = TryCatch(async(req,res,next)=>{

    const {name,members} = req.body;


    const allmembers = [...members,req.user];

    await Chat.create({
        name,
        groupchat:true,
        creator:req.user,
        members:allmembers
    })

    emitEvent(req,ALERT,allmembers,`Welcome to ${name} group`);
    emitEvent(req,REFETCH_CHATS,members);

    return res.status(201).json({
        success:true,
        message:"Group created"
    });

})

const getMyChat = TryCatch(async(req,res,next)=>{

    const chats = await Chat.find({members:req.user})
    .populate(
        "members",
        "name avatar"
    );

    const transformedChats = chats.map(({_id,name,members,groupchat}) => {

        const otherMember = getOtherMember(members,req.user);

        return {
            _id,
            groupchat,
            avatar:groupchat ? members.slice(0,3).map(({avatar})=>avatar.url):[otherMember.avatar.url],
            name:groupchat ? name : otherMember.name,
            members:members.reduce((prev,curr) => {
                if(curr._id.toString() !== req.user.toString()){
                    prev.push(curr._id);
                }
                return prev;
            },[])
        };
    })

    return res.status(200).json({
        success:true,
        chats:transformedChats
    });

})

const getMyGroup = TryCatch(async(req,res,next) => {
    const chats = await Chat.find({
        members:req.user,
        groupchat:true,
        creator:req.user
    }).populate(
        "members",
        "name avatar"
    );

    const groups = chats.map(({members,_id,groupchat,name})=>
    ({
        _id,
        groupchat,
        name,
        avatar:members.slice(0,3).map(({avatar}) => avatar.url),

    }))

    return res.status(200).json({
        success:true,
        groups
    })

})

const addMembers = TryCatch(async(req,res,next) => {
    
    const {chatId,members} = req.body;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    if(!chat.groupchat) return next(new ErrorHandler("This is not a group Chat",404));

    if(chat.creator.toString() !== req.user.toString()) return next(new ErrorHandler("You are not allowed to add members",403)); 

    const allNewMembersPromise = members.map((i)=> User.findById(i,"name"));

    const allNewMembers = await Promise.all(allNewMembersPromise);


    const uniqueMembers = allNewMembers.filter((i)=> !chat.members.includes(i._id.toString())
).map((i)=> i._id);

    chat.members.push(...uniqueMembers);

    if(chat.length > 100) return next(ErrorHandler ("Group members limit reached",400));

    await chat.save()


    const allUsersName = allNewMembers.map((i)=>i.name).join(",");

    emitEvent(
        req,
        ALERT,
        chat.members,
        `${allUsersName} has been added in the group`
    );

    emitEvent(req,REFETCH_CHATS,chat.members)

    return res.status(200).json({
        success:true,
        message:"Members added successfully"
    })    

})

const removeMembers = TryCatch(async(req,res,next) => {
    
    const {userId,chatId} = req.body;

    const [chat,userThatWillBeRemoved] = await Promise.all(
        [
            Chat.findById(chatId),
            User.findById(userId,"name")
        ]
    );

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    if(!chat.groupchat) return next(new ErrorHandler("This is not a group Chat",404));

    if(chat.creator.toString() !== req.user.toString()) return next(new ErrorHandler("You are not allowed to add members",403)); 

    if(chat.members.length <= 3) return next(new ErrorHandler("Group member must have atleast 3 members",400));

    const allChatMembers = chat.members.map((i)=>i.toString());
    console.log("All chat Members",allChatMembers)
    chat.members = chat.members.filter((member)=> member.toString() !== userId.toString());

    await chat.save();

    emitEvent(
        req,
        ALERT,
        chat.members,
        {
            message: `${userThatWillBeRemoved.name} has been removed from the group`,
            chatId,
        }
        
    );
    
    emitEvent(req,REFETCH_CHATS,allChatMembers)

    
    return res.status(200).json({
        success:true,
        message:`${userThatWillBeRemoved.name} has been removed successfully`
    })

});

const leaveGroup = TryCatch(async(req,res,next)=>{

    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found",400));

    if(!chat.groupchat) return next(new ErrorHandler("This is not a group chat",400));

    const remainingMember = chat.members.filter((member)=> member.toString() !== req.user.toString()
    );

    if(remainingMember.length < 3) return next(new ErrorHandler("Group must have atleast three members ",400));


    if(chat.creator.toString() === req.user.toString()){
        const randomUser = Math.floor(Math.random()*remainingMember.length);

        const newCreator = remainingMember[randomUser];

        chat.creator = newCreator;
        
    }


    chat.members = remainingMember;

    const [user]= await Promise.all([User.findById(req.user,"name"),chat.save()]);

    emitEvent(
        req,
        ALERT,
        chat.members,
        {
            chatId,
            message: `${user.name} has left the group`
        }
    )

    return res.status(200).json({
        success:true,
        message:"Leave group successfully"
    })

})

const sendAttachment = TryCatch(async(req,res,next)=>{

    const {chatId} = req.body;

    const files = req.files || [] ;

    const [chat,me] = await Promise.all([
        Chat.findById(chatId),
        User.findById(req.user,"name")
    ]);

    if(!chat) return next (new ErrorHandler("Chat not found",404));

    if(files.length < 1 ) return next (new ErrorHandler("Please provide attachment",400));

    //upload file
    const attachments = await uploadFilesCloudinary(files) ;

    
    const messageForDB = {
        content:"",
        attachments,
        sender:me._id,
        chat:chatId
    }

    const messageForRealTime = {
        ...messageForDB,
        sender:{
            _id:me._id,
            name:me.name
        },
        chat:chatId
    } ;

    console.log("File is saved ->",files);
    
    const message = await Message.create(messageForDB);


    emitEvent(req,NEW_MESSAGE,chat.members,{
        message:messageForRealTime,
        chatId
    })

    emitEvent(req,NEW_MESSAGE_ALERT,chat.members,{chatId})

    return res.status(200).json({
        success:true,
        message
    });
})

const getChatDetails = TryCatch(async(req,res,next)=>{

    if(req.query.populate === "true"){
        console.log(" Populate ");
        
        const chat = await Chat.findById(req.params.id).populate("members","name avatar").lean();

        if(!chat) return next(new ErrorHandler("Chat not found",404));

        chat.members = chat.members.map(({_id,name,avatar})=>
            ({
                _id,
                name,
                avatar:avatar.url
            })
        )

        
        return res.status(200).json({
            success:true,
            chat
        })

    } else{
    console.log("not Populate ");
    const chat = await Chat.findById(req.params.id);
    
    if(!chat) return next(new ErrorHandler("Chat not found",404));

    return res.status(200).json({
        success:true,
        chat
    })

    }

})

const renameGroup = TryCatch(async(req,res,next)=>{

    const chatId = req.params.id;
    const {name} = req.body;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found" , 404))

    if(!chat.groupchat) return next(new ErrorHandler("This is not a group chat" , 404))

    if(chat.creator.toString() !== req.user.toString()){
        return next(
          new ErrorHandler("You are not allowed to rename the group",403)
        );
    }
    chat.name = name;

    await chat.save();

    emitEvent(req,REFETCH_CHATS,chat.members);

    return res.status(200).json({
        success: true,
        message:"Group renamed successfully"
    })


})

const deleteChat = TryCatch(async(req,res,next) => {

    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    const members = chat.members;

    if(chat.groupchat && chat.creator.toString() !== req.user.toString()){
        return next(new ErrorHandler("You are not allowed to delete the chat",403));
    }

    if(!chat.groupchat && !chat.members.includes(req.user.toString())){
        return next(new ErrorHandler("You are not allowed to delete the chat",403));
    }

    const messageWithAttachments = await Message.find({
        chat: chatId,
        attachments: { $exists: true, $ne: [] }
    })

    const public_ids = [];

    messageWithAttachments.forEach(({attachments}) => 
        attachments.forEach(({public_id}) => public_ids.push(public_id))
    )

    await Promise.all([
        deleteFilesCloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({ chat:chatId })
    ]);

    emitEvent(req,REFETCH_CHATS,members)


    return res.status(200).json({
        success:true,
        message:"Chat deleted successfully"
    })


})

const getMessages = TryCatch(async(req,res,next) => {
    const chatId = req.params.id;

    const {page = 1} = req.query;
    const resultPage = 20;
    const skip = (page - 1)* resultPage;

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    if(!chat.members.includes(req.user.toString())) 
        return next(new ErrorHandler("You are not allowed to read this chat",403));

    const [messages,totalMessageCount] = await Promise.all([
        Message.find({chat:chatId})
        .sort({createdAt: -1})
        .skip(skip)
        .limit(resultPage)
        .populate("sender","name")
        .lean(),
        Message.countDocuments({chat: chatId})
    ])

    const totalPages = Math.ceil(totalMessageCount/resultPage) || 0;

    return res.status(200).json({
        success:true,
        messages:messages.reverse(),
        totalPages
    })

})


export {
    newGroupChat,
    getMyChat,
    getMyGroup,
    addMembers,
    removeMembers,leaveGroup,
    sendAttachment,
    getChatDetails,
    renameGroup,
    deleteChat,
    getMessages
}