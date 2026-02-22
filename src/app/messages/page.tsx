'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiUser, FiClock, FiChevronRight, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import Navbar from '../../components/Navbar';

// Define the conversation interface
interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl: string;
  participants: string[];
  lastMessage: {
    text: string;
    timestamp: Date;
    senderId: string;
  };
  unreadCount: number;
  otherUserName: string;
  otherUserPhotoURL: string;
}

const MessagesPage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchConversations = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        
        // Query conversations where the current user is a participant
        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.uid),
          orderBy('lastMessage.timestamp', 'desc')
        );
        
        const conversationsSnapshot = await getDocs(conversationsQuery);
        
        if (conversationsSnapshot.empty) {
          setConversations([]);
          setLoading(false);
          return;
        }
        
        // Process each conversation
        const conversationsPromises = conversationsSnapshot.docs.map(async (conversationDoc) => {
          const conversationData = conversationDoc.data();
          
          // Get the other user's ID (not the current user)
          const otherUserId = conversationData.participants.find((id: string) => id !== user.uid);
          
          // Get the other user's details
          const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
          const otherUserData = otherUserDoc.exists() ? otherUserDoc.data() : null;
          
          // Get the listing details
          const listingDoc = await getDoc(doc(db, 'foodListings', conversationData.listingId));
          const listingData = listingDoc.exists() ? listingDoc.data() : null;
          
          return {
            id: conversationDoc.id,
            listingId: conversationData.listingId,
            listingTitle: listingData?.title || 'Unknown Listing',
            listingImageUrl: listingData?.imageUrl || '/placeholder-food.jpg',
            participants: conversationData.participants,
            lastMessage: {
              text: conversationData.lastMessage.text,
              timestamp: conversationData.lastMessage.timestamp.toDate(),
              senderId: conversationData.lastMessage.senderId
            },
            unreadCount: conversationData.unreadCount?.[user.uid] || 0,
            otherUserName: otherUserData?.displayName || 'Unknown User',
            otherUserPhotoURL: otherUserData?.photoURL || '/placeholder-avatar.jpg'
          } as Conversation;
        });
        
        const fetchedConversations = await Promise.all(conversationsPromises);
        setConversations(fetchedConversations);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load your messages. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [isAuthenticated, user, router]);

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">Communicate with donors and recipients</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="flex justify-center">
                <FiMessageSquare className="text-gray-400 text-5xl mb-4" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Messages Yet</h2>
              <p className="text-gray-600 mb-6">
                When you contact a food donor or someone messages you about your listings, the conversations will appear here.
              </p>
              <Link
                href="/listings"
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                Browse Listings
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {conversations.map((convo) => (
                  <motion.li
                    key={convo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link href={`/messages/${convo.id}`} className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {convo.otherUserPhotoURL ? (
                              <Image
                                src={convo.otherUserPhotoURL}
                                alt={convo.otherUserName}
                                width={40}
                                height={40}
                                className="rounded-full h-10 w-10 object-cover"
                              />
                            ) : (
                              <div className="rounded-full h-10 w-10 bg-green-100 flex items-center justify-center">
                                <FiUser className="text-green-600" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                {convo.otherUserName}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-1">
                                Re: {convo.listingTitle}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500 flex items-center">
                                <FiClock className="mr-1 h-3 w-3" />
                                {formatTimestamp(convo.lastMessage.timestamp)}
                              </span>
                              <FiChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                            {convo.unreadCount > 0 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                                {convo.unreadCount} new
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {convo.lastMessage.senderId === user?.uid ? (
                              <span className="text-gray-500">You: </span>
                            ) : null}
                            {convo.lastMessage.text}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="flex-shrink-0 h-8 w-8 rounded overflow-hidden">
                            <Image
                              src={convo.listingImageUrl}
                              alt={convo.listingTitle}
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {convo.listingTitle}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MessagesPage;
