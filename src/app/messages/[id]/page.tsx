'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiSend, FiArrowLeft, FiInfo, FiAlertTriangle, FiExternalLink } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import Navbar from '../../../components/Navbar';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  read: boolean;
}

interface ConversationDetails {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl: string;
  participants: string[];
  otherUserId: string;
  otherUserName: string;
  otherUserPhotoURL: string;
}

const ConversationPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchConversationDetails = async () => {
      if (!user?.uid || !id) return;
      
      // Create a variable to store the unsubscribe function
      let unsubscribeFromMessages: (() => void) | undefined;

      try {
        setLoading(true);
        const conversationDocRef = doc(db, 'conversations', id as string);
        const conversationDoc = await getDoc(conversationDocRef);
        
        if (!conversationDoc.exists()) {
          setError('Conversation not found');
          setLoading(false);
          return;
        }
        
        const conversationData = conversationDoc.data();
        
        // Verify that the current user is a participant
        if (!conversationData.participants.includes(user.uid)) {
          setError('You do not have access to this conversation');
          setLoading(false);
          return;
        }
        
        // Get the other user's ID (not the current user)
        const otherUserId = conversationData.participants.find((participantId: string) => participantId !== user.uid);
        
        // Get the other user's details
        const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
        const otherUserData = otherUserDoc.exists() ? otherUserDoc.data() : null;
        
        // Get the listing details
        const listingDoc = await getDoc(doc(db, 'foodListings', conversationData.listingId));
        const listingData = listingDoc.exists() ? listingDoc.data() : null;
        
        setConversationDetails({
          id: conversationDoc.id,
          listingId: conversationData.listingId,
          listingTitle: listingData?.title || 'Unknown Listing',
          listingImageUrl: listingData?.imageUrl || '/placeholder-food.jpg',
          participants: conversationData.participants,
          otherUserId,
          otherUserName: otherUserData?.displayName || 'Unknown User',
          otherUserPhotoURL: otherUserData?.photoURL || '/placeholder-avatar.jpg'
        });
        
        // Set up real-time listener for messages
        const messagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationDoc.id),
          orderBy('timestamp', 'asc')
        );
        
        // Initial loading of messages
        const messagesSnapshot = await getDocs(messagesQuery);
        const fetchedMessages = messagesSnapshot.docs.map(messageDoc => {
          const messageData = messageDoc.data();
          return {
            id: messageDoc.id,
            text: messageData.text,
            senderId: messageData.senderId,
            timestamp: messageData.timestamp.toDate(),
            read: messageData.read || false
          } as Message;
        });
        
        setMessages(fetchedMessages);
        
        // Set up real-time listener for new messages
        unsubscribeFromMessages = onSnapshot(messagesQuery, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const messageData = change.doc.data();
              const newMessage = {
                id: change.doc.id,
                text: messageData.text,
                senderId: messageData.senderId,
                timestamp: messageData.timestamp.toDate(),
                read: messageData.read || false
              } as Message;
              
              // Only add if it's not already in the messages array
              setMessages(prev => {
                const messageExists = prev.some(msg => msg.id === newMessage.id);
                if (!messageExists) {
                  return [...prev, newMessage];
                }
                return prev;
              });
              
              // Mark message as read if it's from the other user
              if (messageData.senderId !== user.uid && !messageData.read) {
                updateDoc(doc(db, 'messages', change.doc.id), { read: true });
              }
            }
            
            if (change.type === 'modified') {
              const messageData = change.doc.data();
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === change.doc.id 
                    ? {
                        ...msg,
                        text: messageData.text,
                        read: messageData.read || false
                      }
                    : msg
                )
              );
            }
          });
          
          // Scroll to bottom on new messages
          setTimeout(scrollToBottom, 100);
        });
        
        // Mark messages as read
        if (fetchedMessages.length > 0) {
          // Update unread count for current user in conversation
          const unreadCountUpdate = {
            [`unreadCount.${user.uid}`]: 0
          };
          await updateDoc(conversationDocRef, unreadCountUpdate);
          
          // Mark each unread message from the other user as read
          const unreadMessages = fetchedMessages.filter(
            msg => !msg.read && msg.senderId !== user.uid
          );
          
          const markReadPromises = unreadMessages.map(msg => 
            updateDoc(doc(db, 'messages', msg.id), { read: true })
          );
          
          if (markReadPromises.length > 0) {
            await Promise.all(markReadPromises);
          }
        }
        
        setLoading(false);
        
        // Return the unsubscribe function to be called on cleanup
        return unsubscribeFromMessages;
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('Failed to load the conversation. Please try again.');
        setLoading(false);
      }
    };

    // Store the Promise that resolves to the unsubscribe function
    const unsubscribePromise = fetchConversationDetails();
    
    // Return a cleanup function
    return () => {
      // When the component unmounts, resolve the promise and call the unsubscribe function if it exists
      unsubscribePromise.then(unsubscribeFn => {
        if (unsubscribeFn) unsubscribeFn();
      }).catch(err => console.error('Error in cleanup:', err));
    };
  }, [id, isAuthenticated, user, router]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user?.uid || !conversationDetails) return;
    
    try {
      setSendingMessage(true);
      
      // Add new message to the messages collection
      const messageData = {
        conversationId: conversationDetails.id,
        text: newMessage.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp(),
        read: false
      };
      
      const newMessageRef = await addDoc(collection(db, 'messages'), messageData);
      
      // Update the conversation with the last message
      const conversationRef = doc(db, 'conversations', conversationDetails.id);
      
      // Increment unread count for other user
      const unreadCountUpdate = {
        lastMessage: {
          text: newMessage.trim(),
          timestamp: serverTimestamp(),
          senderId: user.uid
        },
        [`unreadCount.${conversationDetails.otherUserId}`]: (messages.filter(m => !m.read && m.senderId === user.uid).length + 1)
      };
      
      await updateDoc(conversationRef, unreadCountUpdate);
      
      // Add the new message to the local state
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: newMessageRef.id,
          text: newMessage.trim(),
          senderId: user.uid,
          timestamp: new Date(),
          read: false
        }
      ]);
      
      // Clear the input field
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send your message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageDate = (timestamp: Date) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (timestamp.toDateString() === now.toDateString()) {
      return 'Today ' + timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
    } else if (timestamp.toDateString() === yesterday.toDateString()) {
      return 'Yesterday ' + timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
    } else {
      return timestamp.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }) + ' ' + timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    
    messages.forEach(message => {
      const messageDate = message.timestamp.toDateString();
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          date: messageDate,
          messages: [message]
        });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });
    
    return groups;
  };

  return (
    <>
      <Navbar />
      <div className="h-screen bg-gray-50 flex items-center justify-center overflow-hidden py-[34px]">
        <div className="w-full max-w-4xl mx-auto bg-white shadow-xl rounded-xl h-[calc(100vh-68px)] flex flex-col border border-gray-100 overflow-hidden relative">
          {/* Header */}
          {conversationDetails && (
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-white rounded-t-xl shadow-sm absolute top-0 left-0 right-0 z-10 h-[72px]">
              <div className="flex items-center space-x-3">
                <Link href="/messages" className="text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-all duration-300">
                  <FiArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex items-center space-x-3">
                  {conversationDetails.otherUserPhotoURL ? (
                    <Image
                      src={conversationDetails.otherUserPhotoURL}
                      alt={conversationDetails.otherUserName}
                      width={40}
                      height={40}
                      className="rounded-full h-10 w-10 object-cover"
                    />
                  ) : (
                    <div className="rounded-full h-10 w-10 bg-green-100 flex items-center justify-center">
                      <span className="text-green-800 font-medium">
                        {conversationDetails.otherUserName.substring(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="font-medium text-gray-900">{conversationDetails.otherUserName}</h2>
                    <p className="text-xs text-gray-500">Re: {conversationDetails.listingTitle}</p>
                  </div>
                </div>
              </div>
              <Link 
                href={`/listings/${conversationDetails.listingId}`}
                className="text-sm text-green-600 hover:text-green-700 flex items-center bg-green-50 hover:bg-green-100 px-3 py-2 rounded-full transition-all duration-300"
              >
                View Listing <FiExternalLink className="ml-1 h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Message area */}
          <div className="absolute top-[72px] bottom-[72px] left-0 right-0 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}>
            {loading ? (
              <div className="flex flex-col justify-center items-center h-full space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200"></div>
                  <div className="absolute top-0 left-0 animate-spin rounded-full h-12 w-12 border-t-4 border-green-500"></div>
                </div>
                <p className="text-gray-500 text-sm animate-pulse">Loading conversation...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-md">
                  <div className="flex">
                    <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
                <Link 
                  href="/messages" 
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Back to Messages
                </Link>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-gray-100 rounded-full p-3 mb-3">
                  <FiInfo className="h-6 w-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Start a conversation</h3>
                <p className="text-gray-500 max-w-md mb-6">
                  Send a message to start a conversation about {conversationDetails?.listingTitle}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupMessagesByDate().map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="flex justify-center mb-4">
                      <div className="bg-gray-200 px-3 py-1 rounded-full text-xs text-gray-600">
                        {new Date(group.date).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {group.messages.map((message) => (
                        <div key={message.id} className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`max-w-xs md:max-w-md px-5 py-4 rounded-2xl shadow-sm ${message.senderId === user?.uid ? 'rounded-br-sm' : 'rounded-bl-sm'} ${
                              message.senderId === user?.uid
                                ? 'bg-green-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-800'
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            <div className={`text-xs mt-1 flex justify-end ${
                              message.senderId === user?.uid ? 'text-green-100' : 'text-gray-500'
                            }`}>
                              {formatMessageDate(message.timestamp)}
                              {message.senderId === user?.uid && (
                                <span className="ml-1">{message.read ? ' • Read' : ''}</span>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message input */}
          {conversationDetails && (
            <div className="border-t border-gray-200 p-4 bg-white absolute bottom-0 left-0 right-0 shadow-lg rounded-b-xl z-10 h-[72px] flex items-center">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3 w-full">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 text-black border border-gray-200 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-inner bg-gray-50"
                  disabled={sendingMessage}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className={`rounded-full p-3 shadow-md ${
                    !newMessage.trim() || sendingMessage
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-105 transition-all'
                  }`}
                >
                  <FiSend className="h-5 w-5" />
                  {sendingMessage && (
                    <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-white">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    </span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ConversationPage;
