/* eslint-disable no-loop-func */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton } from '@material-ui/core';
import {
  Page,
  Content,
  Progress,
  EmptyState,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { ChatHistory } from '../ChatHistory/ChatHistory';
import { ChatInput } from '../ChatInput/ChatInput';
import { ChatSidebar } from '../ChatSidebar/ChatSidebar';
import { llmChatApiRef, ChatSession, ChatMessage } from '../../api/LlmChatApi';
import AddIcon from '@material-ui/icons/Add';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: 'calc(100vh - 120px)',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #d1d1d1',
    minWidth: 0,
  },
  divider: {
    width: '4px',
    backgroundColor: '#f1f1f1',
    cursor: 'col-resize',
    borderLeft: '1px solid #d1d1d1',
    borderRight: '1px solid #d1d1d1',
    height: '100%',
    userSelect: 'none',
    '&:hover': {
      backgroundColor: '#e4e4e4',
    },
  },
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  header: {
    backgroundColor: '#f1f1f1',
    borderBottom: '1px solid #d1d1d1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    minHeight: 44,
  },
  headerTitle: {
    fontSize: '14px',
    color: '#1c1c1e',
    fontWeight: 500,
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  messageArea: {
    flex: 1,
    overflow: 'auto',
    padding: 16,
  },
  inputContainer: {
    padding: 16,
    borderTop: '1px solid #d1d1d1',
  },
  addButton: {
    color: '#0b84ff',
    '&:hover': {
      backgroundColor: 'rgba(11, 132, 255, 0.1)',
    },
  },
});

export const LlmChatPage = () => {
  const classes = useStyles();
  const api = useApi(llmChatApiRef);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    const loadedSessions = await api.getSessions();
    setSessions(loadedSessions);
  }, [api]);

  const loadCurrentSession = useCallback(async (sessionId: string) => {
    const session = await api.getSession(sessionId);
    setCurrentSession(session);
  }, [api]);


  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadSessions();
        await loadCurrentSession('default');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [loadSessions, loadCurrentSession]);

  useEffect(() => {
    const loadSession = async () => {
      try {
        await loadCurrentSession(currentSessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };

    loadSession();
  }, [currentSessionId, loadCurrentSession]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession, currentResponse]);

  const handleSend = async (message: string) => {
    setIsStreaming(true);
    setCurrentResponse('');

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    setCurrentSession(prevSession => {
      if (!prevSession) return null;
      return {
        ...prevSession,
        messages: [...prevSession.messages, userMessage],
      };
    });

    try {
      let fullResponse = '';
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setCurrentSession(prevSession => {
        if (!prevSession) return null;
        return {
          ...prevSession,
          messages: [...prevSession.messages, assistantMessage],
        };
      });

      const assistantMessageIndex = currentSession?.messages.length ?? 0;

      for await (const chunk of api.chat(message, currentSessionId)) {
        fullResponse += chunk;

        setCurrentSession(prevSession => {
          if (!prevSession) return null;
          
          const updatedMessages = [...prevSession.messages];
          if (updatedMessages[assistantMessageIndex]) {
            updatedMessages[assistantMessageIndex] = {
              ...updatedMessages[assistantMessageIndex],
              content: fullResponse,
            };
          }
          
          return {
            ...prevSession,
            messages: updatedMessages,
          };
        });
      }

      await loadCurrentSession(currentSessionId);
      await loadSessions();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewSession = async () => {
    const newSession = await api.createSession();
    await loadSessions();
    setCurrentSessionId(newSession.id);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await api.deleteSession(sessionId);
    await loadSessions();
    if (sessionId === currentSessionId) {
      setCurrentSessionId('default');
    }
  };

  if (isLoading) {
    return <Progress />;
  }

  if (error) {
    return <EmptyState missing="data" title="Error" description={error} />;
  }

  return (
    <Page themeId="tool">
      <Content>
        <Box className={classes.container}>
          <ChatSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={setCurrentSessionId}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
          />
          <div className={classes.divider} />
          <Box className={classes.chatContainer}>
            <Box className={classes.header}>
              <Typography className={classes.headerTitle}>
                To: Backstage AI Assistant
              </Typography>
              <IconButton
                size="small"
                onClick={handleNewSession}
                className={classes.addButton}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box className={classes.chatArea}>
              <Box className={classes.messageArea}>
                {currentSession && <ChatHistory messages={currentSession.messages} />}
                {currentResponse && (
                  <ChatHistory
                    messages={[{ role: 'assistant', content: currentResponse, timestamp: Date.now() }]}
                  />
                )}
                <div ref={messagesEndRef} />
              </Box>
              <Box className={classes.inputContainer}>
                <ChatInput onSend={handleSend} disabled={isStreaming} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Content>
    </Page>
  );
};