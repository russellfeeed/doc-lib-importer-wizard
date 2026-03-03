import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ComparisonRow {
  field: string;
  localValue: string;
  wpValue: string;
  isDifferent: boolean;
}

interface WpComparisonPanelProps {
  rows: ComparisonRow[];
}

const WpComparisonPanel: React.FC<WpComparisonPanelProps> = ({ rows }) => {
  const hasDifferences = rows.some(r => r.isDifferent);

  return (
    <div className="rounded-md border">
      <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2 text-sm font-medium">
        {hasDifferences ? (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Differences found with WordPress</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>All fields match WordPress</span>
          </>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Field</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>WordPress</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.field} className={row.isDifferent ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
              <TableCell className="font-medium text-xs">{row.field}</TableCell>
              <TableCell className="text-xs max-w-[200px] truncate" title={row.localValue}>
                {row.localValue || <span className="text-muted-foreground italic">empty</span>}
              </TableCell>
              <TableCell className="text-xs max-w-[200px] truncate" title={row.wpValue}>
                {row.wpValue || <span className="text-muted-foreground italic">empty</span>}
              </TableCell>
              <TableCell>
                {row.isDifferent ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WpComparisonPanel;
