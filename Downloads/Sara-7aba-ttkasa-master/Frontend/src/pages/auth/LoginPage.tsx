import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/api";
import { Store, Eye, EyeOff, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AvailableRole, Profile } from "@/types";

export default function LoginPage() {
  const { login, selectRole } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);

  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [selectedRoleIdx, setSelectedRoleIdx] = useState("");
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

  useEffect(() => {
    authApi.profiles().then((data) => {
      setProfiles(data);
    }).catch(() => {
      setError("Failed to load profiles");
    }).finally(() => {
      setProfilesLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const profile = profiles.find((p) => p.user_id === Number(selectedUserId));
    if (!profile) {
      setError("Please select a profile");
      return;
    }
    setLoading(true);
    try {
      const result = await login(profile.username, password);
      if (result.requiresRoleSelection && result.availableRoles.length > 1) {
        setAvailableRoles(result.availableRoles);
        setSelectedRoleIdx("0");
        setNeedsRoleSelection(true);
        setLoading(false);
        return;
      }
      const routes: Record<string, string> = { admin: "/admin", market: "/market", warehouse: "/warehouse" };
      navigate(routes[result.userData.role] || "/admin", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRole = async () => {
    setError("");
    const role = availableRoles[Number(selectedRoleIdx)];
    if (!role) return;
    setLoading(true);
    try {
      const userData = await selectRole(role.role, role.market_id);
      const routes: Record<string, string> = { admin: "/admin", market: "/market", warehouse: "/warehouse" };
      navigate(routes[userData.role] || "/admin", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to Djaber Distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {!needsRoleSelection ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile</Label>
                  {profilesLoading ? (
                    <div className="flex h-10 items-center rounded-md border px-3 text-sm text-muted-foreground">
                      Loading profiles...
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        required
                      >
                        <option value="">Choose a profile</option>
                        {profiles.map((p) => (
                          <option key={p.user_id} value={p.user_id}>
                            {p.username} ({p.market_name || p.role})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading || profilesLoading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">Choose which profile you want to enter</p>

                <div className="space-y-2">
                  <Label>Profile</Label>
                  <div className="relative">
                    <select
                      value={selectedRoleIdx}
                      onChange={(e) => setSelectedRoleIdx(e.target.value)}
                      className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
                    >
                      {availableRoles.map((r, idx) => (
                        <option key={idx} value={idx}>
                          {r.market_name || r.role}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
                  </div>
                </div>

                <Button onClick={handleConfirmRole} className="w-full" disabled={loading}>
                  {loading ? "Entering..." : "Enter"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => { setNeedsRoleSelection(false); setAvailableRoles([]); setError(""); }}>
                  Back to Login
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
