import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge } from "@/components/asset/asset-badges";
import { ModerationStatusBadge } from "@/components/moderation/status-badge";
import { AssetRowActions } from "@/components/manager/asset-row-actions";
import { ManagerAssetsEmptyState } from "@/components/manager/assets-empty-state";
import { formatDate, formatEur } from "@/lib/taxonomy";
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

export function AssetsTable({
  assets,
  isFiltered,
}: {
  assets: AssetRow[];
  isFiltered: boolean;
}) {
  if (assets.length === 0) {
    return <ManagerAssetsEmptyState isFiltered={isFiltered} />;
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
              {/* The same badge buyer browse renders, not a local lookalike:
                  a category is one thing across the app, and two variants of
                  it is how the manager's view starts drifting from what a
                  buyer actually sees. */}
              <TableCell>
                <CategoryBadge category={asset.category} />
              </TableCell>
              <TableCell>{asset.country}</TableCell>
              <TableCell>{asset.industry}</TableCell>
              <TableCell>{formatEur(asset.askingPrice)}</TableCell>
              <TableCell>
                <ModerationStatusBadge status={asset.listingStatus} />
              </TableCell>
              <TableCell className="text-muted-foreground">{asset.sellerName}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(asset.createdAt)}
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
