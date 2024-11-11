import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  InputBase,
  styled,
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import { ChatSession } from '../../api/LlmChatApi';
import { useApi } from '@backstage/core-plugin-api';
import { llmChatApiRef } from '../../api/LlmChatApi';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

const SidebarContainer = styled('div')({
  width: 320,
  minWidth: 320,
  maxWidth: 400,
  backgroundColor: '#f1f1f1',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  flexShrink: 0,
  overflow: 'hidden',
  '@media (max-width: 600px)': {
    width: 280,
    minWidth: 280,
  },
});

const SearchContainer = styled('div')({
  padding: '16px 8px 8px',
});

const SearchBox = styled('div')({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#e4e4e4',
  borderRadius: 4,
  padding: '4px 8px',
});

const StyledSearchIcon = styled(SearchIcon)({
  color: '#8e8e8e',
  marginRight: 8,
});

const StyledInputBase = styled(InputBase)({
  flex: 1,
  fontSize: '14px',
  '& input': {
    color: '#8e8e8e',
  },
});

const SessionsList = styled(List)({
  flex: 1,
  overflowY: 'auto',
  padding: '0 8px',
});

const SessionItem = styled(ListItem)({
  borderRadius: 4,
  marginBottom: 4,
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: '#0b84ff0a',
  },
  '&.selected': {
    backgroundColor: '#0b84ff14',
    '&:hover': {
      backgroundColor: '#0b84ff1f',
    },
  },
});

const AvatarCircle = styled('div')({
  width: 32,
  height: 32,
  borderRadius: '50%',
  backgroundColor: '#0b84ff',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
  fontSize: '16px',
  flexShrink: 0,
});

const TitleContainer = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  minWidth: 0,
});

const SessionTitle = styled(Typography)({
  fontWeight: 500,
  fontSize: '14px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

const TimeStamp = styled(Typography)({
  fontSize: '12px',
  color: '#8e8e8e',
  marginLeft: 8,
  flexShrink: 0,
});

const LastMessage = styled(Typography)({
  color: '#8e8e8e',
  fontSize: '13px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const truncateText = (text: string, limit: number = 50) => {
  if (text.length <= limit) return text;
  return `${text.substring(0, limit).trim()}...`;
};

export const ChatSidebar = ({
  sessions: allSessions,
  currentSessionId,
  onSessionSelect,
}: ChatSidebarProps) => {
  const api = useApi(llmChatApiRef);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>(allSessions);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim()) {
        const results = await api.searchSessions(searchQuery);
        setFilteredSessions(results);
      } else {
        setFilteredSessions(allSessions);
      }
    };

    performSearch();
  }, [searchQuery, allSessions, api]);

  return (
    <SidebarContainer>
      <SearchContainer>
        <SearchBox>
          <StyledSearchIcon />
          <StyledInputBase
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchBox>
      </SearchContainer>

      <SessionsList>
        {filteredSessions.map(session => (
          <SessionItem
            key={session.id}
            button
            className={session.id === currentSessionId ? 'selected' : ''}
            onClick={() => onSessionSelect(session.id)}
          >
            <AvatarCircle>
              {session.title.charAt(0).toUpperCase()}
            </AvatarCircle>
            
            <ListItemText
              primary={
                <TitleContainer>
                  <SessionTitle>
                    {session.title}
                  </SessionTitle>
                  <TimeStamp>
                    {new Date(session.lastMessageTime).toLocaleTimeString([], { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </TimeStamp>
                </TitleContainer>
              }
              secondary={
                <LastMessage>
                  {truncateText(session.lastMessage, 50)}
                </LastMessage>
              }
            />
          </SessionItem>
        ))}
      </SessionsList>
    </SidebarContainer>
  );
};