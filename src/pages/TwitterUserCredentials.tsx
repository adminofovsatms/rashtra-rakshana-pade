import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Search, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TwitterUser {
  user_id: string;
  username: string;
  email: string;
  pwd: string;
  claimed: boolean;
}

const ViewTwitterUsers = () => {
  const [users, setUsers] = useState<TwitterUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<TwitterUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [claimFilter, setClaimFilter] = useState<"all" | "claimed" | "unclaimed">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSuperAdmin();
    fetchTwitterUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, claimFilter]);

  const checkSuperAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map(r => r.role) || [];
    if (!userRoles.includes("super_admin")) {
      navigate("/");
    }
  };

  const fetchTwitterUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("twitter_id_map")
        .select("user_id, username, email, pwd, claimed")
        .order("username", { ascending: true });

      if (error) throw error;

      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch Twitter users",
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
      );
    }

    // Apply claim filter
    if (claimFilter === "claimed") {
      filtered = filtered.filter((user) => user.claimed === true);
    } else if (claimFilter === "unclaimed") {
      filtered = filtered.filter((user) => user.claimed === false);
    }

    setFilteredUsers(filtered);
  };

  const toggleClaim = async (userId: string, currentClaimStatus: boolean) => {
    setProcessingId(userId);

    try {
      const { error } = await supabase
        .from("twitter_id_map")
        .update({ claimed: !currentClaimStatus })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Account ${!currentClaimStatus ? 'claimed' : 'unclaimed'} successfully`,
        duration: 1000
      });

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === userId ? { ...user, claimed: !currentClaimStatus } : user
        )
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update claim status",
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-2 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Twitter Users Management
            </h1>
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredUsers.length} Users
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-2 py-2 max-w-6xl">
        <Card className="p-3 mb-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={claimFilter} onValueChange={(value: any) => setClaimFilter(value)}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                <SelectValue placeholder="Filter by claim" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="unclaimed">Unclaimed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No users found matching your criteria</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Twitter Handle</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Password</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="text-xs font-medium">{user.username}</TableCell>
                      <TableCell className="text-xs">{user.email}</TableCell>
                      <TableCell className="text-xs font-mono">{user.pwd}</TableCell>
                      <TableCell className="text-center">
                        {user.claimed ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Claimed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Unclaimed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant={user.claimed ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleClaim(user.user_id, user.claimed)}
                          disabled={processingId === user.user_id}
                          className="h-7 text-xs"
                        >
                          {processingId === user.user_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : user.claimed ? (
                            "Unclaim"
                          ) : (
                            "Claim"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ViewTwitterUsers;