import express from 'express';
const router = express.Router();
import {
  createUser, // Handles user registration (no token required)
  login, // Handles user login (no token required)
  getSingleUser, // Fetches user profile (requires token)
  saveBook, // Saves a book (requires token)
  deleteBook, // Deletes a saved book (requires token)
} from '../../controllers/user-controller.js';

// import middleware
import { authenticateToken } from '../../services/auth.js';

// put authMiddleware anywhere we need to send a token for verification of user
router.route('/')  
  .post(createUser) // Handle user creation (registration)
  .put(authenticateToken, saveBook); // Authenticated route to save a book to the user's saved books

router.route('/login') // Handle login
  .post(login);

router.route('/me')
  .get(authenticateToken, getSingleUser);  // Get user profile, requires authentication

router.route('/books/:bookId')
  .delete(authenticateToken, deleteBook);

export default router;
