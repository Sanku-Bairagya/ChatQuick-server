import mongoose,{Schema,model,Types} from "mongoose";

const schema = new Schema({
    content:String,
    chat:{
        type:Types.ObjectId,
        ref:"Chat",
        required:true
    },
    sender:{
        type:Types.ObjectId,
        ref:"User",
        required:true
    },
    attachments:[
     { 
        public_id:{
            type:String,
        },
        url:{
            type:String,
        },
     }
    ],
},
{
    timestamps:true
}
);

export const Message = mongoose.models.Message || model("Message",schema);