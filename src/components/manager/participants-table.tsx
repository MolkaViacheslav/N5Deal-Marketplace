import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ModerationStatusBadge } from "@/components/moderation/status-badge";
import { ParticipantRowActions } from "@/components/manager/participant-row-actions";
import { ROLE_LABEL } from "@/lib/nav-items";
import { formatDate } from "@/lib/taxonomy";
import type { Role, UserStatus } from "@/generated/prisma/enums";

export type ParticipantRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  companyName: string | null;
  createdAt: Date;
};

export function ParticipantsTable({ participants }: { participants: ParticipantRow[] }) {
  if (participants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        No participants match these filters.
      </p>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant) => (
            <TableRow key={participant.id}>
              <TableCell className="font-medium">{participant.name}</TableCell>
              <TableCell className="text-muted-foreground">{participant.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{ROLE_LABEL[participant.role]}</Badge>
              </TableCell>
              <TableCell>
                <ModerationStatusBadge status={participant.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {participant.companyName ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(participant.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <ParticipantRowActions
                  userId={participant.id}
                  name={participant.name}
                  status={participant.status}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
