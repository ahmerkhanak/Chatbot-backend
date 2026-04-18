const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();


router.post('/register', async ( req, res) => {

    try {
        const { username, email, password } = req.body

        let user = await User.findOne({email});
        if(user){
            return res.status(400).json({message: 'User Already Exists'});
        }

        user = new User({
            username,
            email,
            password
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        res.status(200).json({message: 'User registered Successfully'});

    } catch (err){
        console.error(err.message);
        res.status(500).send('Server Error');
    }

});

router.post('/login', async (req, res) => {

    try{

        const {email, password} = req.body;

        let user = await User.findOne({email});

        if(!user){
            return res.status(400).json({message: 'Invalid Credentials'})
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch){
            return res.status(400).json({message: 'Invalid Credentials'});
        }

        const payload = {
            user: { id: user.id }
        };

        jwt.sign(
            payload,
            process.env.SECRET_KEY,
            { expiresIn: '1h'},

            (err, token) => {
                if(err) throw err;
                res.json({token});
            }
        );

    } catch (err){
        console.error(err.message)
        res.status(500).send('Server Error')
    }

});

router.get('/me', auth, async (req, res) => {
    try{
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);

    } catch (err){
        res.status(500).send('Server Error')
    }
});

module.exports = router;

