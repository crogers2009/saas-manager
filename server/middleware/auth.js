import { db } from '../database.js';

// Simple authentication middleware for demo purposes
// In a real app, you'd use JWT tokens or similar
export const authenticateUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Get user from database
  db.get(
    'SELECT id, name, email, role, department_id FROM users WHERE id = ? AND is_active = 1',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid user' });
      }

      // Transform database fields to match frontend expectations
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.department_id
      };

      next();
    }
  );
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
      // Department heads can only see software used by their department
      if (!user.departmentId) {
        return { whereClause: 'WHERE 1 = 0', params: [] }; // No results if no department
      }
      return { 
        whereClause: `WHERE EXISTS (
          SELECT 1 FROM software_departments sd 
          WHERE sd.software_id = s.id AND sd.department_id = ?
        )`, 
        params: [user.departmentId] 
      };
    
    default:
      // Unknown role - no access
      return { whereClause: 'WHERE 1 = 0', params: [] };
  }
};