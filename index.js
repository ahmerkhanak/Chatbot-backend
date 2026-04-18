const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const auth = require('./middleware/auth');
const Message = require('./models/Message');
const Chat = require('./models/Chat');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const authRoutes = require('./routes/auth');
const mongoose = require('mongoose')

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(function(){
        console.log('Database Connected Successfully');
    })
    .catch(function(err){
        console.error('DataBase wasnt connected', err.message);
        process.exit(1);
    });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

app.post('/chat', auth, async (req, res) => {
    try {
        let { message, chatId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const userId = req.user.id;

        if (!chatId) {
            const title = message.split(' ').slice(0, 4).join(' ') + '...';
            const newChat = new Chat({ userId, title });
            await newChat.save();
            chatId = newChat._id;
        }

        const userMsg = new Message ({
            chatId,
            userId,
            role : 'user',
            text: message
        });
        await userMsg.save();

        const result = await model.generateContent(message);
        const text = result.response.text();
        const botMsg = new Message ({
            chatId,
            userId, 
            role: 'bot',
            text: text
        });

        await botMsg.save();

        res.json({ reply: text, chatId });

    } catch (error) {
        console.error('Failed', error)
        res.status(500).json({ error: "The AI is having a moment, try again later" });
    }
});

app.get('/api/chats', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/chats/:chatId/messages', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.user.id });
        if (!chat) return res.status(404).json({ error: "Chat not found" });

        const messages = await Message.find({ chatId: chat._id }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is listening at ${PORT}`)
});

