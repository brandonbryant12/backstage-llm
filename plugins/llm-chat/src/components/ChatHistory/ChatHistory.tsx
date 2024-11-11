import React from 'react';
import { Typography, styled } from '@material-ui/core';
import { ChatMessage } from '../../api/LlmChatApi';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import DoneIcon from '@material-ui/icons/Done';

interface ChatHistoryProps {
  messages: ChatMessage[];
}

interface CodeBlockProps {
  language?: string;
  value: string;
}

const StyledBox = styled('div')({
  position: 'relative',
  margin: '8px 0',
  padding: 24,
  paddingTop: 32,
  borderRadius: 4,
  backgroundColor: '#1e1e1e',
});

const Pre = styled('pre')({
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: '#e6e6e6',
  fontSize: '0.875rem',
  lineHeight: 1.5,
  overflow: 'auto',
  margin: 0,
});

const CopyButton = styled('div')({
  position: 'absolute',
  right: 8,
  top: 8,
  padding: '4px 8px',
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: 4,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  color: '#fff',
  fontSize: 12,
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

const MessageContent = styled(Typography)({
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontSize: '0.9375rem',
  lineHeight: 1.4,
});

const MessageContainer = styled('div')({
  display: 'flex',
  marginBottom: 8,
});

const MessageBubble = styled('div')({
  padding: 12,
  maxWidth: '70%',
  backgroundColor: '#E9E9EB',
  color: '#000000',
  borderRadius: 24,
  borderTopRightRadius: 20,
  borderTopLeftRadius: 2,
  position: 'relative',
  boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
  '& code': {
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: '2px 4px',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: '0.875rem',
  },
  '&.user': {
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    borderTopRightRadius: 2,
    borderTopLeftRadius: 20,
  },
});

const ChatContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
});

const CodeBlock = ({ value }: CodeBlockProps) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <StyledBox>
      <CopyButton onClick={handleCopy}>
        {copied ? (
          <>
            <DoneIcon style={{ fontSize: 14 }} />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <FileCopyIcon style={{ fontSize: 14 }} />
            <span>Copy</span>
          </>
        )}
      </CopyButton>
      <Pre>{value}</Pre>
    </StyledBox>
  );
};

const formatMessage = (content: string) => {
  const parts: JSX.Element[] = [];
  let currentIndex = 0;

  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > currentIndex) {
      parts.push(
        <MessageContent key={`text-${currentIndex}`}>
          {content.slice(currentIndex, match.index)}
        </MessageContent>
      );
    }

    parts.push(
      <CodeBlock
        key={`code-${match.index}`}
        value={match[2]}
        language={match[1]}
      />
    );

    currentIndex = match.index + match[0].length;
  }

  if (currentIndex < content.length) {
    parts.push(
      <MessageContent key={`text-${currentIndex}`}>
        {content.slice(currentIndex)}
      </MessageContent>
    );
  }

  return parts;
};

export const ChatHistory = ({ messages }: ChatHistoryProps) => {
  return (
    <ChatContainer>
      {messages.map((message, index) => (
        <MessageContainer
          key={`${message.timestamp}-${message.role}-${index}`}
          style={{
            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
          }}
        >
          <MessageBubble className={message.role === 'user' ? 'user' : ''}>
            {formatMessage(message.content)}
          </MessageBubble>
        </MessageContainer>
      ))}
    </ChatContainer>
  );
};