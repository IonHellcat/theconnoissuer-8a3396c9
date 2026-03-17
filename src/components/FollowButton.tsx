import { useAuth } from "@/hooks/useAuth";
import { useFollows } from "@/hooks/useFollows";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FollowButtonProps {
  userId: string;
}

const FollowButton = ({ userId }: FollowButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFollowing, follow, unfollow } = useFollows();

  if (!user || user.id === userId) return null;

  const following = isFollowing(userId);

  const handleClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (following) {
      unfollow.mutate(userId);
    } else {
      follow.mutate(userId);
    }
  };

  return (
    <Button
      size="sm"
      variant={following ? "secondary" : "default"}
      onClick={handleClick}
      className="gap-1.5 text-xs"
    >
      {following ? (
        <>
          <UserCheck className="h-3.5 w-3.5" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </>
      )}
    </Button>
  );
};

export default FollowButton;
