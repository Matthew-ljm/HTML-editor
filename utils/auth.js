import jwt from 'jsonwebtoken';

export const verifyToken = (authHeader) => {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: null, error: 'Unauthorized' };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: decoded.userId, error: null };
  } catch (error) {
    console.error('Token verification error:', error);
    return { userId: null, error: 'Invalid token' };
  }
};