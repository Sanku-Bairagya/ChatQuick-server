const corsOptions = {
    origin:["http://localhost:5173",process.env.CLIENT_URL],
    methods: ["GET","HEAD","PUT","PATCH","POST","DELETE"],
    credentials:true,
}

const chatQuick_Token = "chatQuick"
export {corsOptions,chatQuick_Token}