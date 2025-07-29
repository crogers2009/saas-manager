import jwt from 'jsonwebtoken';
import { db } from '../database.js';
import { JWT_SECRET } from '../config.js';

export const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }
  next();
};

// Middleware to filter software based on user role
export const createSoftwareFilter = (user) => {
  switch (user.role) {
    case 'Administrator':
      // Admins can see all software
      return { whereClause: '', params: [] };
    
    case 'Software Owner':
      // Software owners can only see software they own
      return { 
        whereClause: 'WHERE s.owner_id = ?', 
        params: [user.id] 
      };
    
    case 'Department Head':
      // Department heads can see software they own OR software used by any of their departments
      // Since this function is synchronous, we'll need to handle departments in the calling code
      // For now, return a filter that allows software they own
      return { 
        whereClause: `WHERE s.owner_id = ? OR EXISTS (
          SELECT 1 FROM software_departments sd 
          JOIN user_departments ud ON sd.department_id = ud.department_id
          WHERE sd.software_id = s.id AND ud.user_id = ?
        )`, 
        params: [user.id, user.id] 
      };
    
    default:
      // Unknown role - no access
      return { whereClause: 'WHERE 1 = 0', params: [] };
  }
};