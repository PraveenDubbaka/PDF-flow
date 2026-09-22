import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
 ({ className,...props }, ref) => (
 <div className="relative w-full overflow-auto">
 <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
 </div>
 ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
 ({ className,...props }, ref) => (
 <thead 
 ref={ref} 
 className={cn(
 // Clean header without heavy borders
 "bg-muted/40",
 className
 )} 
 {...props} 
 />
 ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
 ({ className,...props }, ref) => (
 <tbody ref={ref} className={cn("", className)} {...props} />
 ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
 ({ className,...props }, ref) => (
 <tfoot 
 ref={ref} 
 className={cn(
 "border-t border-border/30 bg-muted/30 font-medium [&>tr]:last:border-b-0", 
 className
 )} 
 {...props} 
 />
 ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
 ({ className,...props }, ref) => (
 <tr
 ref={ref}
 className={cn(
 // Clean borderless rows with subtle separator
 "border-b border-border/20 transition-all duration-200 ease-emphasized",
 // Hover with pop-out effect
 "hover:bg-primary/[0.04] hover:shadow-[0_2px_8px_hsl(213_40%_20%/0.04)]",
 // Selected state
 "data-[state=selected]:bg-primary/[0.08]",
 className
 )}
 {...props}
 />
 ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
 ({ className,...props }, ref) => (
 <th
 ref={ref}
 className={cn(
 // Clean header cells
 "h-12 px-5 text-left align-middle",
 "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
 "[&:has([role=checkbox])]:pr-0",
 className,
 )}
 {...props}
 />
 ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
 ({ className,...props }, ref) => (
 <td 
 ref={ref} 
 className={cn(
 // Generous padding for readability
 "px-5 py-4 align-middle",
 "[&:has([role=checkbox])]:pr-0", 
 className
 )} 
 {...props} 
 />
 ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
 ({ className,...props }, ref) => (
 <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
 ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
