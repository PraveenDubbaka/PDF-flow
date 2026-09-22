import React, { useState } from "react";
import { Search, ChevronDown, Pencil, Trash2, Mail, UserPlus, Users, UserCheck, ShieldCheck, UsersRound, KeyRound } from "lucide-react";
import { ExpandableIconButton } from "@/components/ui/expandable-icon-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Layout } from "@/components/Layout";
import { StyledCard } from "@/components/ui/card";

// Sample stats
const stats = [
 { label: "Partners", value: "80" },
 { label: "Staff", value: "49" },
 { label: "CMS", value: "2" },
 { label: "Total Team", value: "131" },
];

// Sample team members
const teamMembers = [
 { id: "-", name: "Cpt Group", title: "cpt-10176", status: "Accepted", email: "cpt10176canada@yopmail.c...", category: "Partner", clients: "132", businessPhone: "-", cellPhone: "(424) 234-2424", assignedPartner: "-", hourlyRate: "-", twoFAStatus: "-", licenseNo: "-" },
 { id: "-", name: "Pen Test", title: "-", status: "Accepted", email: "pentest+role4@sspentest.c...", category: "Partner", clients: "-", businessPhone: "-", cellPhone: "-", assignedPartner: "-", hourlyRate: "-", twoFAStatus: "-", licenseNo: "-" },
 { id: "-", name: "Shai Firm", title: "ms", status: "Accepted", email: "shfirmuat@yopmail.com", category: "Partner", clients: "-", businessPhone: "-", cellPhone: "-", assignedPartner: "-", hourlyRate: "60.00", twoFAStatus: "-", licenseNo: "-" },
 { id: "-", name: "Norbert B", title: "Pen Test", status: "Accepted", email: "norbert@strivesec.com", category: "Staff", clients: "2", businessPhone: "-", cellPhone: "-", assignedPartner: "Unassigned", hourlyRate: "124.00", twoFAStatus: "-", licenseNo: "-", unassigned: true },
 { id: "-", name: "Haroon S", title: "API", status: "Accepted", email: "haroons@countable.co", category: "Staff", clients: "-", businessPhone: "-", cellPhone: "-", assignedPartner: "Unassigned", hourlyRate: "256.00", twoFAStatus: "-", licenseNo: "-", unassigned: true },
 { id: "-", name: "Amol Patil", title: "-", status: "Accepted", email: "amolp@countable.co", category: "CMS (Countable Managed Staff)", clients: "-", businessPhone: "-", cellPhone: "-", assignedPartner: "-", hourlyRate: "-", twoFAStatus: "-", licenseNo: "-" },
 { id: "-", name: "Staff Test", title: "HV", status: "Accepted", email: "stafftest@yopmail.com", category: "Partner", clients: "-", businessPhone: "-", cellPhone: "-", assignedPartner: "-", hourlyRate: "-", twoFAStatus: "-", licenseNo: "-" },
 { id: "-", name: "Ishaan S", title: "CA", status: "Invite Now", email: "ishaan@yopmail.com", category: "Partner", clients: "-", businessPhone: "-", cellPhone: "-", assignedPartner: "-", hourlyRate: "-", twoFAStatus: "-", licenseNo: "-" },
 { id: "-", name: "Henry Davis", title: "Mr", status: "Accepted", email: "general_2511281624292@y...", category: "Partner", clients: "-", businessPhone: "-", cellPhone: "-", assignedPartner: "-", hourlyRate: "-", twoFAStatus: "-", licenseNo: "-" },
];

const StatusBadge = ({ status }: { status: string }) => {
 const getVariant = () => {
 switch (status) {
 case "Accepted":
 return "accepted" as const;
 case "Invite Now":
 return "inviteNow" as const;
 default:
 return "secondary" as const;
 }
 };
 return <Badge variant={getVariant()}>{status}</Badge>;
};

function Highlight({ text, query }: { text: string; query: string }) {
 if (!query.trim()) return <>{text}</>;
 const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
 return (
  <>
   {parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
     <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-sm px-0.5 not-italic">{part}</mark>
    ) : (
     <span key={i}>{part}</span>
    )
   )}
  </>
 );
}

export default function Teams() {
 const [searchQuery, setSearchQuery] = useState("");
 const [activeTab, setActiveTab] = useState("all-teams");

 const q = searchQuery.toLowerCase();
 const filteredMembers = teamMembers.filter(m => {
  const tabMatch =
   activeTab === 'all-teams' ||
   (activeTab === 'partner' && m.category === 'Partner') ||
   (activeTab === 'staff' && m.category === 'Staff') ||
   (activeTab === 'cms' && m.category.startsWith('CMS'));
  if (!tabMatch) return false;
  if (!q) return true;
  return (
   m.name.toLowerCase().includes(q) ||
   m.title.toLowerCase().includes(q) ||
   m.email.toLowerCase().includes(q) ||
   m.category.toLowerCase().includes(q) ||
   m.status.toLowerCase().includes(q)
  );
 });


 const tabs = [
 { id: "all-teams", label: "All Teams" },
 { id: "partner", label: "Partner" },
 { id: "staff", label: "Staff" },
 { id: "cms", label: "CMS" },
 ];

 return (
 <Layout title="Team">
 <div className="flex h-full overflow-hidden bg-background">
 <div className="flex-1 p-6 overflow-hidden flex flex-col min-w-0">
 <div className="flex flex-col flex-1 gap-5 min-h-0">
 {/* Stats Cards */}
 <div className="flex items-center gap-3 flex-shrink-0">
 {stats.map((stat, index) => {
 const config = [
 { color: 'text-primary', bg: 'bg-primary/10', icon: UserCheck },
 { color: 'text-primary', bg: 'bg-primary/10', icon: Users },
 { color: 'text-primary', bg: 'bg-primary/10', icon: ShieldCheck },
 { color: 'text-primary', bg: 'bg-primary/10', icon: UsersRound },
 ];
 const { color, bg, icon: Icon } = config[index];
 return (
 <div
 key={index}
 className="flex items-center gap-3 px-5 py-3 flex-1 bg-card border border-border shadow-sm cursor-default hover:shadow-md transition-shadow"
 style={{ borderRadius: '12px' }}
 >
 <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
 <Icon className={`h-4.5 w-4.5 ${color}`} strokeWidth={2} />
 </div>
 <div className="flex flex-col">
 <span className={`text-xl font-bold leading-none ${color}`}>{stat.value}</span>
 <span className="text-[13px] font-medium text-foreground leading-tight mt-0.5 whitespace-nowrap">{stat.label}</span>
 </div>
 </div>
 );
 })}
 </div>

 {/* Tabs and Actions Row */}
 <div className="flex items-center justify-between flex-shrink-0">
 {/* Tabs */}
 <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-1">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`px-4 py-1.5 text-sm font-medium transition-colors rounded-sm ${
 activeTab === tab.id
 ? "bg-[#1C63A6] text-white"
 : "text-muted-foreground hover:bg-muted"
 }`}
 style={{ fontWeight: 600 }}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* Actions */}
 <div className="flex items-center gap-2">
 <ExpandableIconButton
 variant="secondary"
 icon={<UserPlus className="h-4 w-4" />}
 label="Assign Partner"
 />
 <ExpandableIconButton
 variant="secondary"
 icon={<Mail className="h-4 w-4" />}
 label="Invite All"
 />
 <ExpandableIconButton
 variant="secondary"
 icon={<KeyRound className="h-4 w-4" />}
 label="Reset 2 FA"
 />
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 w-44 h-9 text-sm"
 />
 </div>
 <Button className="bg-[#1C63A6] hover:bg-[#1a5a9e] text-white h-9 px-4 text-sm font-medium">
 Add Team
 <ChevronDown className="h-4 w-4 ml-1.5" />
 </Button>
 </div>
 </div>

 {/* Team Table */}
 <StyledCard className="overflow-hidden flex flex-col flex-1 min-h-0 -mt-2">
 <div className="flex-1 overflow-y-auto overflow-x-auto">
 <table className="w-full">
 <thead className="sticky top-0 z-10">
 <tr className="bg-muted border-b border-border">
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap w-10">
 <Checkbox />
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Member ID</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Name</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Title</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Status</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Email</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Category</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Clients</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Business Phone</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Cell Phone</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Assigned Partner</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Hourly Rate</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">2FA Status</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">License No</th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredMembers.length === 0 && searchQuery.trim() ? (
          <tr><td colSpan={15} className="px-6 py-12 text-center">
           <p className="text-sm font-medium text-foreground">No results for &ldquo;{searchQuery}&rdquo;</p>
           <p className="text-xs text-muted-foreground mt-1">Try a different name, email, or category</p>
          </td></tr>
         ) : filteredMembers.map((member, idx) => (
 <tr
 key={idx}
 className="hover:bg-muted/50 transition-colors group max-h-[50px]"
 style={{ maxHeight: '50px' }}
 >
 <td className="px-6 py-2 whitespace-nowrap">
 <Checkbox />
 </td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{member.id}</td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap"><Highlight text={member.name} query={searchQuery} /></td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap"><Highlight text={member.title} query={searchQuery} /></td>
 <td className="px-6 py-2 whitespace-nowrap">
 <StatusBadge status={member.status} />
 </td>
 <td className="px-6 py-2 whitespace-nowrap">
 <a href={`mailto:${member.email}`} className="text-sm text-link hover:underline">
 {member.email}
 </a>
 </td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap"><Highlight text={member.category} query={searchQuery} /></td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{member.clients}</td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{member.businessPhone}</td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{member.cellPhone}</td>
 <td className="px-6 py-2 whitespace-nowrap">
 {member.unassigned ? (
 <span className="text-sm text-link cursor-pointer hover:underline flex items-center gap-1">
 Unassigned <Users className="h-3.5 w-3.5" />
 </span>
 ) : (
 <span className="text-sm text-foreground">{member.assignedPartner}</span>
 )}
 </td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{member.hourlyRate}</td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{member.twoFAStatus}</td>
 <td className="px-6 py-2 text-sm text-foreground whitespace-nowrap">{member.licenseNo}</td>
 <td className="px-6 py-2 whitespace-nowrap">
 <div className="flex items-center gap-2">
 {member.status === "Invite Now" ? (
 <button className="p-1.5 hover:bg-muted rounded-lg transition-colors">
 <Mail className="h-4 w-4 text-link" />
 </button>
 ) : (
 <button className="p-1.5 hover:bg-muted rounded-lg transition-colors">
 <Pencil className="h-4 w-4 text-link" />
 </button>
 )}
 <button className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
 <Trash2 className="h-4 w-4 text-destructive" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </StyledCard>
 </div>
 </div>
 </div>
 </Layout>
 );
}
