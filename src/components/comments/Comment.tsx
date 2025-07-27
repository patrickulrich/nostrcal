import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NostrEvent } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { useComments } from '@/hooks/useComments';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useReactions, usePublishReaction, useRemoveReaction, COMMON_REACTIONS } from '@/hooks/useReactions';
import { CommentForm } from './CommentForm';
import { NoteContent } from '@/components/NoteContent';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal, 
  Trash2, 
  ThumbsUp,
  Plus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDisplayNameWithLoadingState } from '@/utils/displayName';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

interface CommentProps {
  root: NostrEvent | URL;
  comment: NostrEvent;
  depth?: number;
  maxDepth?: number;
  limit?: number;
}

export function Comment({ root, comment, depth = 0, maxDepth = 3, limit }: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(depth < 2); // Auto-expand first 2 levels
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  const author = useAuthor(comment.pubkey);
  const { data: commentsData } = useComments(root, limit);
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Reaction hooks
  const { data: reactionsData, isLoading: reactionsLoading } = useReactions(comment.id);
  const { mutateAsync: publishReaction, isPending: isReacting } = usePublishReaction();
  const { mutateAsync: removeReaction, isPending: isRemoving } = useRemoveReaction();
  
  const metadata = author.data?.metadata;
  const displayName = getDisplayNameWithLoadingState(
    comment.pubkey, 
    metadata, 
    author.isLoading, 
    !!author.error
  );
  const timeAgo = formatDistanceToNow(new Date(comment.created_at * 1000), { addSuffix: true });

  // Get direct replies to this comment
  const replies = commentsData?.getDirectReplies(comment.id) || [];
  const hasReplies = replies.length > 0;

  // Check if current user is the comment author
  const isAuthor = user?.pubkey === comment.pubkey;
  
  // Get reaction summary
  const reactionSummary = reactionsData?.summary;
  const userReaction = reactionSummary?.userReaction;

  const handleDeleteComment = async () => {
    if (!user || !isAuthor) return;

    try {
      setIsDeleting(true);
      
      // Create NIP-09 deletion event
      await publishEvent({
        kind: 5,
        content: 'Deleted comment',
        tags: [['e', comment.id]],
        created_at: Math.floor(Date.now() / 1000),
      });

      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully.",
      });

      // Invalidate comments query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['comments', root instanceof URL ? root.toString() : root.id] 
      });

    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReaction = async (content: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to react to comments.",
        variant: "destructive",
      });
      return;
    }

    try {
      // If user already has this reaction, remove it
      if (userReaction && userReaction.content === content) {
        await removeReaction({
          reactionId: userReaction.id,
          targetEventId: comment.id,
        });
        
        toast({
          title: "Reaction removed",
          description: "Your reaction has been removed.",
        });
      } else {
        // Add new reaction (this will replace any existing reaction)
        if (userReaction) {
          // Remove existing reaction first
          await removeReaction({
            reactionId: userReaction.id,
            targetEventId: comment.id,
          });
        }
        
        await publishReaction({
          targetEvent: comment,
          content,
        });

        toast({
          title: "Reaction added",
          description: `You reacted with ${content === '+' ? '👍' : content}`,
        });
      }
      
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Failed to react:', error);
      toast({
        title: "Error",
        description: "Failed to add reaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleQuickLike = () => {
    handleReaction('+');
  };

  return (
    <div className={`space-y-3 ${depth > 0 ? 'ml-6 border-l-2 border-muted pl-4' : ''}`}>
      <Card className="bg-card/50">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Comment Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Link to={`/${nip19.npubEncode(comment.pubkey)}`}>
                  <Avatar className="h-8 w-8 hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer">
                    <AvatarImage src={metadata?.picture} />
                    <AvatarFallback className="text-xs">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link 
                    to={`/${nip19.npubEncode(comment.pubkey)}`}
                    className="font-medium text-sm hover:text-primary transition-colors"
                  >
                    {displayName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
              </div>
            </div>

            {/* Comment Content */}
            <div className="text-sm">
              <NoteContent event={comment} className="text-sm" />
            </div>

            {/* Reaction Summary */}
            {!reactionsLoading && reactionSummary && reactionSummary.totalReactions > 0 && (
              <div className="flex items-center gap-2 pt-2">
                {reactionSummary.likes > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    👍 {reactionSummary.likes}
                  </Badge>
                )}
                {reactionSummary.dislikes > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    👎 {reactionSummary.dislikes}
                  </Badge>
                )}
                {Object.entries(reactionSummary.emojis).map(([emoji, count]) => (
                  <Badge key={emoji} variant="secondary" className="text-xs">
                    {emoji} {count}
                  </Badge>
                ))}
              </div>
            )}

            {/* Comment Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="h-8 px-2 text-xs"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                
                {/* Quick Like Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleQuickLike}
                  disabled={isReacting || isRemoving}
                  className={`h-8 px-2 text-xs ${
                    userReaction?.content === '+' ? 'text-blue-600 bg-blue-50' : ''
                  }`}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {reactionSummary?.likes ? reactionSummary.likes : ''}
                </Button>

                {/* Reaction Picker */}
                <DropdownMenu open={showReactionPicker} onOpenChange={setShowReactionPicker}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={isReacting || isRemoving}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <div className="grid grid-cols-5 gap-1 p-2">
                      {COMMON_REACTIONS.map((reaction) => (
                        <Button
                          key={reaction.emoji}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReaction(reaction.emoji)}
                          className={`h-8 w-8 p-0 text-sm ${
                            userReaction?.content === reaction.emoji ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                          title={reaction.label}
                        >
                          {reaction.emoji === '+' ? '👍' : reaction.emoji === '-' ? '👎' : reaction.emoji}
                        </Button>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {hasReplies && (
                  <Collapsible open={showReplies} onOpenChange={setShowReplies}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                        {showReplies ? (
                          <ChevronDown className="h-3 w-3 mr-1" />
                        ) : (
                          <ChevronRight className="h-3 w-3 mr-1" />
                        )}
                        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                      </Button>
                    </CollapsibleTrigger>
                  </Collapsible>
                )}
              </div>

              {/* Comment menu - only show if user is logged in */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      aria-label="Comment options"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isAuthor && (
                      <DropdownMenuItem
                        onClick={handleDeleteComment}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-700 focus:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    )}
                    {!isAuthor && (
                      <DropdownMenuItem disabled>
                        No actions available
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="ml-6">
          <CommentForm
            root={root}
            reply={comment}
            onSuccess={() => setShowReplyForm(false)}
            placeholder="Write a reply..."
            compact
          />
        </div>
      )}

      {/* Replies */}
      {hasReplies && (
        <Collapsible open={showReplies} onOpenChange={setShowReplies}>
          <CollapsibleContent className="space-y-3">
            {replies.map((reply) => (
              <Comment
                key={reply.id}
                root={root}
                comment={reply}
                depth={depth + 1}
                maxDepth={maxDepth}
                limit={limit}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}