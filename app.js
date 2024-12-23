import express from "express"
import userRoute from "./Routes/user.js"
import chatRoute from "./Routes/chat.js"
import {connectDB} from "./utils/features.js"
import dotenv from "dotenv";
import { errorMiddleWare } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import {Server} from "socket.io"
import {createServer} from "http"
import {v4 as uuid} from "uuid"
import adminRoutre from "./Routes/admin.js"
import { CHAT_EXITED, CHAT_JOINED, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import cors from "cors"
import {v2 as cloudinary} from "cloudinary"
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";

dotenv.config({
    path:"./.env"
})

const adminSecretKey = process.env.ADMIN_SECRET_KEY || "sankudasbairagya"

const app = express();
const server = createServer(app);
const io = new Server(server,{
   cors:corsOptions
});
const onlineUsers = new Set();
app.set("io",io);


app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

connectDB(process.env.MONGO_URI)
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})


const port  = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const userSocketIDs = new Map();

app.use("api/v1/user",userRoute);
app.use("api/v1/chat",chatRoute);
app.use("api/v1/admin",adminRoutre)



app.get("/",(req,res)=>{
    res.send("Hello world !")

})

io.use((socket,next)=> {
   cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err,socket,next)
  )  
})

io.on("connection",(socket) => {

    const user = socket.user;

    userSocketIDs.set(user._id.toString(),socket.id)
    
    socket.on(NEW_MESSAGE, async ({chatId,members,message}) => {
        const messageForRealTime = {
            content:message,
            _id:uuid(),
            sender:{
                _id:user._id,
                name:user.name
            },
            chat:chatId,
            createdAt:new Date().toISOString()
        };  
        const messageForDB = {
            content: message,
            chat: chatId,
            sender: user._id, // Convert to ObjectId
            
        }

       

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(NEW_MESSAGE,{
            chatId,
            message:messageForRealTime
        })

        io.to(membersSocket).emit(NEW_MESSAGE_ALERT,{ chatId });

        try {
            await Message.create(messageForDB);
        } catch (error) {
            throw new Error(error);
        }
               
    })

    socket.on(START_TYPING,({members,chatId}) => {
        const membersSocket = getSockets(members)
        socket.to(membersSocket).emit(START_TYPING,{chatId})
    })

    socket.on(STOP_TYPING,({members,chatId}) => {
        const membersSocket = getSockets(members)
        socket.to(membersSocket).emit(STOP_TYPING,{chatId})
    })

    socket.on(CHAT_JOINED,({userId,members}) => {
        onlineUsers.add(userId.toString());
        
        const membersSocket = getSockets(members)
        io.to(membersSocket).emit(ONLINE_USERS,Array.from(onlineUsers))
        
    })
    socket.on(CHAT_EXITED,({userId,members}) => {
        onlineUsers.delete(userId.toString());

        const membersSocket = getSockets(members)
        io.to(membersSocket).emit(ONLINE_USERS,Array.from(onlineUsers))
    })
    
    socket.on("disconnect",() => {
        userSocketIDs.delete(user._id.toString())
        onlineUsers.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS,Array.from(onlineUsers));
    })
})

app.use(errorMiddleWare);

server.listen(port,()=>{
    console.log(`Server is running on port ${port} in ${envMode} Mode`)
});

export{
    envMode,
    adminSecretKey,
    userSocketIDs
}
