import React from "react";
import { useProposal } from "@/hooks/useProposal";
import { useAtomValue } from "jotai";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { ProposalViewer } from "@/components/state/ProposalViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { showError, showSuccess } from "@/lib/toast";
import { queryKeys } from "@/lib/queryKeys";

/**
 * ProposalPanel Component
 *
 * Integrates ProposalViewer with actual proposal data from the builder.
 * Handles proposal approval and rejection.
 *
 * Part of PR8: FeltDB State-First Application Studio
 */
export const ProposalPanel: React.FC = () => {
  const chatId = useAtomValue(selectedChatIdAtom);
  const { proposalResult, isLoading } = useProposal(chatId);
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async (messageId: number) => {
      if (!chatId) throw new Error("No chat selected");
      return ipc.proposal.approveProposal({ chatId, messageId });
    },
    onSuccess: () => {
      showSuccess("Proposal applied");
      if (chatId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.proposals.detail({ chatId }),
        });
      }
    },
    onError: (error) => {
      showError(error);
    },
  });

  const _rejectMutation = useMutation({
    mutationFn: async (messageId: number) => {
      if (!chatId) throw new Error("No chat selected");
      return ipc.proposal.rejectProposal({ chatId, messageId });
    },
    onSuccess: () => {
      showSuccess("Proposal rejected");
      if (chatId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.proposals.detail({ chatId }),
        });
      }
    },
    onError: (error) => {
      showError(error);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Loading proposals...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!proposalResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No active proposals. Continue chatting with the AI to generate
            proposals.
          </div>
        </CardContent>
      </Card>
    );
  }

  const proposal = proposalResult.proposal;
  const messageId = proposalResult.messageId;

  // Extract file changes from code proposal
  if (proposal.type === "code-proposal") {
    return (
      <ProposalViewer
        title={proposal.title}
        uiChanges={proposal.filesChanged
          .filter((f) => f.path.includes("component") || f.path.includes("tsx"))
          .map((f) => ({
            component: f.name,
            action: f.type,
            details: f.summary,
          }))}
        stateChanges={[]}
        dataChanges={[]}
        fileChanges={proposal.filesChanged}
        impactLevel="medium"
        onApply={() => approveMutation.mutate(messageId)}
        onEdit={() => {
          // TODO: Implement edit mode
        }}
        isLoading={approveMutation.isPending}
      />
    );
  }

  if (proposal.type === "action-proposal") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suggested Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {proposal.actions.map((action, idx) => (
              <li key={idx} className="text-sm">
                • {action.id}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return null;
};
