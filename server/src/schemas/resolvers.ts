import { GraphQLError } from 'graphql';
import User from '../models/User.js';
import { signToken } from '../services/auth.js';
import { Request } from 'express';

const resolvers = {
    Query: {
        // Fetch the currently authenticated user
        me: async (_parent: any, _args: any, context: { req: Request }) => {
            if (!context.req.user) {
                throw new GraphQLError('You must be logged in to perform this action', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }
            return await User.findById(context.req.user._id).select('-__v -password');
        },

        // Retrieve a user by ID or username
        getSingleUser: async (_parent: any, { id, username }: { id?: string; username?: string }) => {
            const foundUser = await User.findOne({
                $or: [{ _id: id }, { username: username }],
            });

            if (!foundUser) {
                throw new GraphQLError('Cannot find a user with this ID or username!', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }
            return foundUser;
        },
    },

    Mutation: {
        // Register a new user and generate an authentication token
        addUser: async (_parent: any, { username, email, password }: { username: string; email: string; password: string }) => {
            try {
                const user = await User.create({ username, email, password });
                const token = signToken(user.username, user.email, user._id);
                return { token, user };
            } catch (err) {
                throw new GraphQLError('Something went wrong creating the user!', {
                    extensions: { code: 'BAD_USER_INPUT', err },
                });
            }
        },

        // Authenticate a user and return a token if credentials are correct
        login: async (_parent: any, { email, password }: { email: string; password: string }) => {
            const user = await User.findOne({ email });

            if (!user) {
                throw new GraphQLError('Cannot find this user', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            const correctPw = await user.isCorrectPassword(password);

            if (!correctPw) {
                throw new GraphQLError('Wrong password!', {
                    extensions: { code: 'UNAUTHORIZED' },
                });
            }

            const token = signToken(user.username, user.email, user._id);
            return { token, user };
        },

        // Save a book to the authenticated user's list
        saveBook: async (_parent: any, { bookData }: { bookData: any }, context: { req: Request }) => {
            if (!context.req.user) {
                throw new GraphQLError('You must be logged in to save a book', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            try {
                const updatedUser = await User.findOneAndUpdate(
                    { _id: context.req.user._id },
                    { $addToSet: { savedBooks: bookData } },
                    { new: true, runValidators: true }
                );
                return updatedUser;
            } catch (err) {
                console.error('Error saving book:', err);
                throw new GraphQLError('Could not save book', {
                    extensions: { code: 'BAD_USER_INPUT', err },
                });
            }
        },

        // Remove a book from the authenticated user's list
        removeBook: async (_parent: any, { bookId }: { bookId: string }, context: { req: Request }) => {
            if (!context.req.user) {
                throw new GraphQLError('You must be logged in to delete a book', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            try {
                const updatedUser = await User.findOneAndUpdate(
                    { _id: context.req.user._id },
                    { $pull: { savedBooks: { bookId: bookId } } },
                    { new: true }
                );

                if (!updatedUser) {
                    throw new GraphQLError('Could not find user with this ID!', {
                        extensions: { code: 'NOT_FOUND' },
                    });
                }
                return updatedUser;
            } catch (err) {
                console.error('Error removing book:', err);
                throw new GraphQLError('Could not remove book', {
                    extensions: { code: 'BAD_USER_INPUT', err },
                });
            }
        },
    },
};

export default resolvers;