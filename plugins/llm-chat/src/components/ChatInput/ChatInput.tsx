import React, { useState, useRef, ChangeEvent, KeyboardEvent, FormEvent } from 'react';
import { TextField, IconButton, CircularProgress, styled } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const CodePreview = styled('div')({
  marginBottom: 16,
  backgroundColor: '#1e1e1e',
  borderRadius: 4,
  overflow: 'hidden',
  padding: 12,
  color: '#e6e6e6',
  fontSize: '14px',
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
});

const PreviewHeader = styled('div')({
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  paddingBottom: 8,
  marginBottom: 8,
  color: '#888',
  fontSize: '12px',
  fontFamily: 'inherit',
});

const InputContainer = styled('div')({
  width: '100%',
});

const Form = styled('form')({
  display: 'flex',
  gap: 8,
  alignItems: 'flex-end',
});

const SendButton = styled(IconButton)({
  backgroundColor: '#B4B4B6',
  color: '#FFFFFF',
  width: 36,
  height: 36,
  marginBottom: '4px',
  '&:hover': {
    backgroundColor: '#B4B4B6',
  },
  '&.Mui-disabled': {
    backgroundColor: '#B4B4B6',
    color: '#FFFFFF',
  },
  '&.primary': {
    backgroundColor: '#007AFF',
    '&:hover': {
      backgroundColor: '#0051FF',
    },
  },
});

const StyledInput = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    '& fieldset': {
      borderColor: 'transparent',
    },
    '&:hover fieldset': {
      borderColor: 'transparent',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'transparent',
    },
    '& textarea': {
      padding: '10px 16px',
      fontFamily: 'inherit',
    },
    '&.error fieldset': {
      borderColor: '#007AFF',
    },
    '&.error textarea': {
      fontFamily: 'monospace',
    },
  },
});

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [isInCodeBlock, setIsInCodeBlock] = useState(false);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage('');
      setIsInCodeBlock(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return;
      }

      if (!isInCodeBlock && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as any);
      }
    }

    if (e.key === '`' && e.ctrlKey) {
      e.preventDefault();
      const start = textFieldRef.current?.selectionStart || 0;
      const end = textFieldRef.current?.selectionEnd || 0;
      const newMessage = 
        `${message.slice(0, start)}\`\`\`\n${message.slice(start, end)}\n\`\`\`${message.slice(end)}`;
      
      setMessage(newMessage);
      setIsInCodeBlock(true);
      
      setTimeout(() => {
        const newPosition = start + 4;
        textFieldRef.current?.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setMessage(newValue);
    const backtickCount = (newValue.match(/```/g) || []).length;
    setIsInCodeBlock(backtickCount % 2 === 1);
  };

  const getCodePreview = () => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const matches = [...message.matchAll(codeBlockRegex)];
    return matches.map((match, index) => ({
      language: match[1] || 'text',
      code: match[2],
      fullMatch: match[0],
      index,
    }));
  };

  const isButtonActive = message.trim() && !isInCodeBlock;

  return (
    <InputContainer>
      {getCodePreview().map((preview, index) => (
        <CodePreview key={index}>
          <PreviewHeader>
            {preview.language || 'text'}
          </PreviewHeader>
          {preview.code}
        </CodePreview>
      ))}
      <Form onSubmit={handleSubmit}>
        <StyledInput
          inputRef={textFieldRef}
          fullWidth
          multiline
          minRows={1}
          maxRows={12}
          variant="outlined"
          placeholder={isInCodeBlock ? 'Complete code block to send' : 'Ask a question'}
          value={message}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyDown(e as unknown as KeyboardEvent<HTMLTextAreaElement>)}
          disabled={disabled}
          size="small"
          className={isInCodeBlock ? 'error' : ''}
          error={isInCodeBlock}
        />
        <SendButton
          type="submit"
          disabled={disabled || !message.trim() || isInCodeBlock}
          className={isButtonActive ? 'primary' : ''}
        >
          {disabled ? <CircularProgress size={20} /> : <SendIcon fontSize="small" />}
        </SendButton>
      </Form>
    </InputContainer>
  );
};