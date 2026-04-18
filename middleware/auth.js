const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.header('x-auth-token');

    if(!token){
        return res.status(401).json({message: 'Unauthorized Access'})
    }

    try{
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        req.user = decoded.user;

        next();
    } catch (err){
        console.error('Unauthorized', err.message)
        res.status(401).json({message : 'Unauthorized'})
    }

};