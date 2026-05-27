const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    try {
        // 1. Check header
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        // 2. No token → stop immediately
        if (!token) {
            return res.status(401).json({
                message: 'Not authorized, no token'
            });
        }

        // 3. Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'secret123'
        );

        // 4. Get user
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                message: 'User not found'
            });
        }

        // 5. Attach user
        req.user = user;

        // 6. Continue
        next();

    } catch (error) {
        console.error('Auth Error:', error.message);

        return res.status(401).json({
            message: 'Not authorized, token invalid or expired'
        });
    }
};

module.exports = { protect };