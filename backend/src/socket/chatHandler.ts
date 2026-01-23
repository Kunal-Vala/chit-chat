import { Server, Socket } from "socket.io";
import { Jwt } from "jsonwebtoken";
import Message from "../models/Message";
import Conversation from "../models/Conversation";
import { JwtPayloadType } from "../types";
import User from "../models/User";

const onlineUsers = new Map<string, string>();

export const setupChatHandlers = (io : Server) => {

}


export const getOnlineUsers = () =>{
    return Array.from(onlineUsers.keys());
};