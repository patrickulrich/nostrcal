import React from 'react';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayNameWithLoadingState } from '@/utils/displayName';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ParticipantsListProps {
  participants: string[];
  maxVisible?: number;
  _showAvatars?: boolean;
}

interface ParticipantNameProps {
  pubkey: string;
}

function ParticipantName({ pubkey }: ParticipantNameProps) {
  const profile = useAuthor(pubkey);
  
  const displayName = getDisplayNameWithLoadingState(
    pubkey,
    profile.data?.metadata,
    profile.isLoading,
    !!profile.error
  );

  if (profile.isLoading) {
    return <Skeleton className="h-4 w-16 inline-block" />;
  }

  return <span>{displayName}</span>;
}

export function ParticipantsList({ 
  participants, 
  maxVisible = 5, 
  _showAvatars = false 
}: ParticipantsListProps) {
  if (!participants || participants.length === 0) {
    return null;
  }

  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = participants.length - maxVisible;

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="text-sm">
        {visibleParticipants.map((pubkey, index) => (
          <React.Fragment key={pubkey}>
            {index > 0 && ', '}
            <ParticipantName pubkey={pubkey} />
          </React.Fragment>
        ))}
        {remainingCount > 0 && (
          <span className="text-muted-foreground">
            {visibleParticipants.length > 0 ? ', ' : ''}
            +{remainingCount} more
          </span>
        )}
      </div>
    </div>
  );
}

export default ParticipantsList;