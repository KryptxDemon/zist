import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  userId?: string;
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  clickable?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function UserAvatar({
  userId,
  name,
  avatarUrl,
  size = "md",
  className,
  clickable = true,
}: UserAvatarProps) {
  const navigate = useNavigate();
  const initial = name?.[0]?.toUpperCase() || "U";

  const handleClick = () => {
    if (clickable && userId) {
      navigate(`/app/user/${userId}`);
    }
  };

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        clickable && userId && "cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all",
        className,
      )}
      onClick={handleClick}
    >
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name} />
      ) : null}
      <AvatarFallback className="bg-primary/15 text-primary font-medium">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
