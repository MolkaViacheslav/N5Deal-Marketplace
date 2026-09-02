import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { AssetRowActions } from "@/components/manager/asset-row-actions";
import { categoryLabel, formatEur } from "@/lib/taxonomy";
import type { VariantProps } from "class-variance-authority";
import type { AssetCategory, ListingStatus } from "@/generated/prisma/enums";

export type AssetRow = {
  id: string;
  title: string;
  category: AssetCategory;
  country: string;
  industry: string;
  askingPrice: number;
  listingStatus: ListingStatus;
  createdAt: Date;
  sellerName: string;
};

const STATUS_VARIANT: Record<ListingStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  ACTIVE: "success",
  SUSPENDED: "secondary",
  REMOVED: "destructive",
};

const STATUS_LABEL: Record<ListingStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REMOVED: "Removed",
};

export function AssetsTable({ assets }: { assets: AssetRow[] }) {
  if (assets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        No listings match these filters.
      </p>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Asking price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Seller</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell className="font-medium">{asset.title}</TableCell>
              <TableCell>
                <Badge variant="outline">{categoryLabel(asset.category)}</Badge>
              </TableCell>
              <TableCell>{asset.country}</TableCell>
              <TableCell>{asset.industry}</TableCell>
              <TableCell>{formatEur(asset.askingPrice)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[asset.listingStatus]}>
                  {STATUS_LABEL[asset.listingStatus]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{asset.sellerName}</TableCell>
              <TableCell className="text-muted-foreground">
                {asset.createdAt.toLocaleDateString("en-IE", {
                  timeZone: "Europe/Dublin",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell className="text-right">
                <AssetRowActions
                  assetId={asset.id}
                  title={asset.title}
                  listingStatus={asset.listingStatus}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
