import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { ParticipantRowActions } from "@/components/manager/participant-row-actions";
import { ROLE_LABEL } from "@/lib/nav-items";
import type { VariantProps } from "class-variance-authority";
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

const STATUS_VARIANT: Record<UserStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  ACTIVE: "success",
  SUSPENDED: "secondary",
  REMOVED: "destructive",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REMOVED: "Removed",
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
                <Badge variant={STATUS_VARIANT[participant.status]}>
                  {STATUS_LABEL[participant.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {participant.companyName ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {participant.createdAt.toLocaleDateString("en-IE", {
                  timeZone: "Europe/Dublin",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
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
