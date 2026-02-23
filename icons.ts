/**
 * icons.ts — Icon compatibility shim
 * Maps lucide-react names → @phosphor-icons/react equivalents.
 * Based on user icon selection 2026-02-20.
 */
// NOTE: Keep this file sorted alphabetically within each section for easy maintenance.

// First import everything we need from Phosphor under unique local names
import {
    ChartLineUp as _Activity,
    SealWarning as _AlertCircle,
    Warning as _AlertTriangle,
    Archive as _Archive,
    Bell as _Bell,
    BellSimpleRinging as _BellRing,
    Book as _Book,
    BookOpenText as _BookOpen,
    Package as _Box,
    Briefcase as _Briefcase,
    Factory as _Factory,
    Calculator as _Calculator,
    Calendar as _Calendar,
    CalendarCheck as _CalendarClock,
    Camera as _Camera,
    CheckFat as _Check,
    CheckCircle as _CheckCircle,
    CheckSquare as _CheckSquare,
    CaretDown as _CaretDown,
    CaretLeft as _CaretLeft,
    CaretRight as _CaretRight,
    CaretUp as _CaretUp,
    ClipboardText as _ClipboardList,
    Clock as _Clock,
    Cloud as _Cloud,
    CloudArrowDown as _CloudDownload,
    CloudArrowUp as _CloudUpload,
    Code as _Code,
    Copy as _Copy,
    Cpu as _Cpu,
    Database as _Database,
    DownloadSimple as _Download,
    Drop as _Droplet,
    PencilSimple as _Edit,
    Pencil as _Edit2,
    CurrencyEur as _Euro,
    LinkSimple as _ExternalLink,
    Eye as _Eye,
    EyeSlash as _EyeOff,
    File as _File,
    FileText as _FileText,
    FileArrowUp as _FileUp,
    FileCode as _FileCode,
    Funnel as _Filter,
    Folder as _Folder,
    FolderOpen as _FolderOpen,
    Speedometer as _Gauge,
    GitBranch as _GitBranch,
    Hammer as _Hammer,
    HardDrives as _HardDrive,
    Info as _Info,
    ClockCounterClockwise as _History,
    Image as _ImageIcon,
    Stack as _Layers,
    Layout as _LayoutDashboard,
    GridFour as _LayoutGrid,
    LinkSimple as _Link,
    ListBullets as _List,
    ListChecks as _ListChecks,
    LockKey as _Lock,
    SignOut as _LogOut,
    At as _Mail,
    MapPin as _MapPin,
    Megaphone as _Megaphone,
    Chat as _MessageSquare,
    Monitor as _Monitor,
    Moon as _Moon,
    TreeStructure as _Network,
    StopCircle as _Octagon,
    Package as _Package,
    ChartPieSlice as _PieChart,
    PlayCircle as _Play,
    PlayCircle as _PlayCircle,
    PlugsConnected as _Plug,
    Plus as _Plus,
    PlusCircle as _PlusCircle,
    Power as _Power,
    ArrowsCounterClockwise as _RefreshCcw,
    ArrowsClockwise as _RefreshCw,
    Recycle as _Recycle,
    ArrowCounterClockwise as _RotateCcw,
    FloppyDisk as _Save,
    Binoculars as _Search,
    PaperPlaneTilt as _Send,
    HardDrives as _Server,
    GearSix as _Settings,
    Shield as _Shield,
    ShieldWarning as _ShieldAlert,
    ShieldCheck as _ShieldCheck,
    BellRinging as _Siren,
    DeviceMobile as _Smartphone,
    Square as _Square,
    Star as _Star,
    Sun as _Sun,
    SunHorizon as _SunMoon,
    Crosshair as _Target,
    Terminal as _Terminal,
    Timer as _Timer,
    Trash as _Trash2,
    TrendUp as _TrendingUp,
    Truck as _Truck,
    User as _User,
    UserCheck as _UserCheck,
    UserCircle as _UserCircle,
    UserPlus as _UserPlus,
    Users as _Users,
    WifiHigh as _Wifi,
    WifiSlash as _WifiOff,
    Wrench as _Wrench,
    X as _X,
    Lightning as _Zap,
    MagnifyingGlassPlus as _ZoomIn,
    // Fallbacks for less-common icons not in user selection
    CircleNotch as _Loader2,
    ArrowsOut as _Maximize,
    ArrowsIn as _Minimize,
    PresentationChart as _Presentation,
    ArrowBendUpRight as _CornerUpRight,
    Cube as _Container,
    Flask as _FlaskConical,
    Flask as _Beaker,
    Hash as _Hash,
    Television as _Tv,
    CaretLeft as _ArrowLeft,
    CaretRight as _ArrowRight,
    ChartBar as _BarChart,
    ChartBar as _BarChart2,
    Eraser as _Delete,
    SealWarning as _CheckCircle2,
    Ruler as _Ruler,
    Thermometer as _Thermometer,
    ChartBar as _BarChart3,
    SpeakerHigh as _Volume2,
    SpeakerX as _VolumeX,
    SpeakerLow as _Volume1,
    SpeakerSlash as _VolumeOff,
    Table as _Table,
    FileCsv as _FileCsv,
} from '@phosphor-icons/react';

// Re-export under the original lucide-react names
export const Activity = _Activity;
export const AlertCircle = _AlertCircle;
export const AlertTriangle = _AlertTriangle;
export const Archive = _Archive;
export const ArrowLeft = _ArrowLeft;
export const ArrowRight = _ArrowRight;
export const BarChart = _BarChart;
export const BarChart2 = _BarChart2;
export const Beaker = _Beaker;
export const Bell = _Bell;
export const BellRing = _BellRing;
export const Book = _Book;
export const BookOpen = _BookOpen;
export const Box = _Box;
export const Briefcase = _Briefcase;
export const Building2 = _Factory;
export const Calculator = _Calculator;
export const Calendar = _Calendar;
export const CalendarClock = _CalendarClock;
export const Camera = _Camera;
export const Check = _Check;
export const CheckCircle = _CheckCircle;
export const CheckCircle2 = _CheckCircle; // same component
export const CheckSquare = _CheckSquare;
export const ChevronDown = _CaretDown;
export const ChevronLeft = _CaretLeft;
export const ChevronRight = _CaretRight;
export const ChevronUp = _CaretUp;
export const ClipboardList = _ClipboardList;
export const Clock = _Clock;
export const Cloud = _Cloud;
export const CloudCog = _Cloud; // fallback
export const CloudDownload = _CloudDownload;
export const CloudUpload = _CloudUpload;
export const Code = _Code;
export const Container = _Container;
export const Copy = _Copy;
export const CornerUpRight = _CornerUpRight;
export const Cpu = _Cpu;
export const Database = _Database;
export const Delete = _Delete;
export const Download = _Download;
export const Droplet = _Droplet;
export const Edit = _Edit;
export const Edit2 = _Edit2;
export const Euro = _Euro;
export const ExternalLink = _ExternalLink;
export const Eye = _Eye;
export const EyeOff = _EyeOff;
export const Factory = _Factory;
export const File = _File;
export const FileCode = _FileCode;
export const FileJson = _FileCode; // same
export const FileText = _FileText;
export const FileUp = _FileUp;
export const Filter = _Filter;
export const FlaskConical = _FlaskConical;
export const Folder = _Folder;
export const FolderOpen = _FolderOpen;
export const Gauge = _Gauge;
export const GitBranch = _GitBranch;
export const Hammer = _Hammer;
export const HardDrive = _HardDrive;
export const Hash = _Hash;
export const HelpCircle = _Info;
export const History = _History;
export const ImageIcon = _ImageIcon;
export const Info = _Info;
export const Layers = _Layers;
export const LayoutDashboard = _LayoutDashboard;
export const LayoutGrid = _LayoutGrid;
export const LayoutPanelLeft = _LayoutDashboard; // fallback
export const LayoutTemplate = _LayoutDashboard;  // fallback
export const Link = _Link;
export const List = _List;
export const ListChecks = _ListChecks;
export const Loader2 = _Loader2;
export const Lock = _Lock;
export const LogOut = _LogOut;
export const Mail = _Mail;
export const MapPin = _MapPin;
export const Maximize = _Maximize;
export const Megaphone = _Megaphone;
export const MessageSquare = _MessageSquare;
export const Minimize = _Minimize;
export const Monitor = _Monitor;
export const Moon = _Moon;
export const Network = _Network;
export const Octagon = _Octagon;
export const Package = _Package;
export const PieChart = _PieChart;
export const Play = _Play;
export const PlayCircle = _PlayCircle;
export const Plug = _Plug;
export const Plus = _Plus;
export const PlusCircle = _PlusCircle;
export const Power = _Power;
export const Presentation = _Presentation;
export const Recycle = _Recycle;
export const RefreshCcw = _RefreshCcw;
export const RefreshCw = _RefreshCw;
export const RotateCcw = _RotateCcw;
export const Save = _Save;
export const Search = _Search;
export const Send = _Send;
export const Server = _Server;
export const Settings = _Settings;
export const Shield = _Shield;
export const ShieldAlert = _ShieldAlert;
export const ShieldCheck = _ShieldCheck;
export const Siren = _Siren;
export const Smartphone = _Smartphone;
export const Square = _Square;
export const Star = _Star;
export const Sun = _Sun;
export const SunMoon = _SunMoon;
export const Target = _Target;
export const Terminal = _Terminal;
export const Timer = _Timer;
export const Trash2 = _Trash2;
export const TrendingUp = _TrendingUp;
export const Truck = _Truck;
export const Ruler = _Ruler;
export const Thermometer = _Thermometer;
export const Tv = _Tv;
export const Upload = _CloudUpload; // upload → cloud-arrow-up
export const User = _User;
export const UserCheck = _UserCheck;
export const UserCircle = _UserCircle;
export const UserPlus = _UserPlus;
export const Users = _Users;
export const Wifi = _Wifi;
export const WifiOff = _WifiOff;
export const Wrench = _Wrench;
export const X = _X;
export const Zap = _Zap;
export const ZoomIn = _ZoomIn;
export const BarChart3 = _BarChart3;
export const Volume2 = _Volume2;
export const VolumeX = _VolumeX;
export const Volume1 = _Volume1;
export const VolumeOff = _VolumeOff;
export const Table = _Table;
export const FileCsv = _FileCsv;

import { X as _ArchiveXFb } from "@phosphor-icons/react";
export const ArchiveX = _ArchiveXFb;
import { Globe as _Globe } from "@phosphor-icons/react";
export const Globe = _Globe;
import { ToggleRight as _ToggleRight } from "@phosphor-icons/react";
export const ToggleRight = _ToggleRight;
import { ToggleLeft as _ToggleLeft } from "@phosphor-icons/react";
export const ToggleLeft = _ToggleLeft;
import { X as _SparklesFb } from "@phosphor-icons/react";
export const Sparkles = _SparklesFb;
import { XCircle as _XCircle } from "@phosphor-icons/react";
export const XCircle = _XCircle;
import { X as _GridFb } from "@phosphor-icons/react";
export const Grid = _GridFb;
import { Wind as _Wind } from "@phosphor-icons/react";
export const Wind = _Wind;
import { ShoppingCart as _ShoppingCart } from "@phosphor-icons/react";
export const ShoppingCart = _ShoppingCart;
import { Paperclip as _Paperclip } from "@phosphor-icons/react";
export const Paperclip = _Paperclip;
import { X as _FileSearchFb } from "@phosphor-icons/react";
export const FileSearch = _FileSearchFb;
import { StopCircle as _StopCircle } from "@phosphor-icons/react";
export const StopCircle = _StopCircle;
import { QrCode as _QrCode } from "@phosphor-icons/react";
export const QrCode = _QrCode;
import { X as _MessageCircleFb } from "@phosphor-icons/react";
export const MessageCircle = _MessageCircleFb;
import { X as _ScaleFb } from "@phosphor-icons/react";
export const Scale = _ScaleFb;
import { BatteryCharging as _BatteryCharging } from "@phosphor-icons/react";
export const BatteryCharging = _BatteryCharging;
import { AlignLeft as _AlignLeft } from "@phosphor-icons/react";
export const AlignLeft = _AlignLeft;
import { X as _BracesFb } from "@phosphor-icons/react";
export const Braces = _BracesFb;
import { Folders as _Folders } from "@phosphor-icons/react";
export const Folders = _Folders;
import { Printer as _Printer } from "@phosphor-icons/react";
export const Printer = _Printer;
import { Bug as _phBug } from "@phosphor-icons/react"; export const Bug = _phBug;

import { X as _phX1 } from "@phosphor-icons/react"; export const Type = _phX1;

import { X as _phX2 } from "@phosphor-icons/react"; export const Shrink = _phX2;

import { X as _phX3 } from "@phosphor-icons/react"; export const Expand = _phX3;

import { Image as _phImage } from "@phosphor-icons/react"; export const Image = _phImage;

import { X as _phX5 } from "@phosphor-icons/react"; export const ScanEye = _phX5;

import { Binary as _phBinary } from "@phosphor-icons/react"; export const Binary = _phBinary;
