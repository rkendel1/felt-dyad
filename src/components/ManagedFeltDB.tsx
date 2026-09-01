import { useState } from "react";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAuthenticateManagedFeltDB,
  useConnectManagedFeltDB,
  useFeltDBStatus,
  useListManagedFeltDBProjects,
  useManagedFeltDBAccount,
} from "@/hooks/useFeltDB";

export function ManagedFeltDB({ appId }: { appId?: number }) {
  const { data: account, isLoading: accountLoading } =
    useManagedFeltDBAccount();
  const { data: projects, isLoading: projectsLoading } =
    useListManagedFeltDBProjects(account?.id);
  const { data: status } = useFeltDBStatus(appId ?? 0);
  const authenticate = useAuthenticateManagedFeltDB();
  const connect = useConnectManagedFeltDB();
  const [apiUrl, setApiUrl] = useState("https://api.feltdb.com");
  const [accountId, setAccountId] = useState("");
  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");

  if (accountLoading) {
    return <Loader2 className="h-5 w-5 animate-spin" />;
  }

  if (!account) {
    return (
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await authenticate.mutateAsync({
            apiUrl,
            accountId,
            email: email || undefined,
            accessToken,
          });
          setAccessToken("");
        }}
      >
        <div>
          <h3 className="font-medium">Set up Managed FeltDB</h3>
          <p className="text-sm text-muted-foreground">
            Add your managed account once, then connect any Builder project. The
            access token is encrypted by the operating system.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="feltdb-api-url">API URL</Label>
            <Input
              id="feltdb-api-url"
              type="url"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feltdb-account-id">Account ID</Label>
            <Input
              id="feltdb-account-id"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feltdb-email">Email (optional)</Label>
            <Input
              id="feltdb-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feltdb-access-token">Access token</Label>
            <Input
              id="feltdb-access-token"
              type="password"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" disabled={authenticate.isPending}>
          {authenticate.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Connect Managed FeltDB
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Managed FeltDB projects</h3>
        <p className="text-sm text-muted-foreground">
          Connected to {account.name || account.email || account.id}
        </p>
      </div>
      {projectsLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : projects?.length ? (
        <div className="grid gap-2">
          {projects.map((project) => {
            const selected = status?.projectId === project.id;
            return (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.id}
                    </p>
                  </div>
                </div>
                {appId && (
                  <Button
                    size="sm"
                    variant={selected ? "secondary" : "outline"}
                    disabled={selected || connect.isPending}
                    onClick={() =>
                      connect.mutate({
                        appId,
                        projectId: project.id,
                        accountId: account.id,
                      })
                    }
                  >
                    {selected ? "Connected" : "Connect"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No managed projects were found for this account.
        </p>
      )}
    </div>
  );
}
