using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Collections.Generic;
using System.Reflection;

[assembly: AssemblyTitle("Residential Masterlist Server Controller")]
[assembly: AssemblyDescription("Residential Masterlist Server Controller")]
[assembly: AssemblyCompany("Eru Studio")]
[assembly: AssemblyProduct("Residential Masterlist")]
[assembly: AssemblyCopyright("Copyright © Eru Studio. All rights reserved.")]
[assembly: AssemblyTrademark("Eru Studio")]
[assembly: AssemblyVersion("1.2.0.0")]
[assembly: AssemblyFileVersion("1.2.0.0")]

namespace ResidentialMasterlist.Launcher
{
    // =======================================================================
    //  CLAY GRAPHICS UTILITIES
    // =======================================================================
    public static class ClayGfx
    {
        public static GraphicsPath CreateRoundedPath(Rectangle r, int radius)
        {
            int d = radius * 2;
            d = Math.Min(d, Math.Min(r.Width, r.Height));
            GraphicsPath p = new GraphicsPath();
            if (d <= 0) { p.AddRectangle(r); return p; }
            p.AddArc(r.X, r.Y, d, d, 180, 90);
            p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure();
            return p;
        }

        public static void DrawClayCard(
            Graphics g,
            Rectangle bounds,
            int radius,
            Color fillTop,
            Color fillBottom,
            Color shadowColor,
            int shadowDepth,
            Color highlightColor)
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            int margin = 8;
            Rectangle body = new Rectangle(
                bounds.X + margin,
                bounds.Y + margin,
                bounds.Width - (margin * 2),
                bounds.Height - (margin * 2) - shadowDepth
            );

            if (body.Width <= 10 || body.Height <= 10) return;

            // 1. Soft layered drop shadow (3D elevation)
            for (int i = 4; i >= 1; i--)
            {
                int alpha = (i == 1) ? 55 : (i == 2 ? 35 : (i == 3 ? 20 : 10));
                int spread = i * 2;
                Rectangle sRect = new Rectangle(
                    body.X - (spread / 2),
                    body.Y + shadowDepth + (i * 2) - 2,
                    body.Width + spread,
                    body.Height + spread
                );
                using (GraphicsPath sPath = CreateRoundedPath(sRect, radius + (spread / 2)))
                using (SolidBrush sBrush = new SolidBrush(Color.FromArgb(alpha, shadowColor)))
                {
                    g.FillPath(sBrush, sPath);
                }
            }

            // 2. Smooth gradient clay body
            using (GraphicsPath path = CreateRoundedPath(body, radius))
            {
                using (LinearGradientBrush lgb = new LinearGradientBrush(
                    body, fillTop, fillBottom, LinearGradientMode.Vertical))
                {
                    g.FillPath(lgb, path);
                }

                // 3. Top-left soft specular glow (Clay "Puff" highlight)
                Rectangle gleamRect = new Rectangle(body.X + 3, body.Y + 3, body.Width - 6, body.Height / 2);
                using (GraphicsPath gleamPath = CreateRoundedPath(gleamRect, Math.Max(2, radius - 3)))
                using (LinearGradientBrush gleamBrush = new LinearGradientBrush(
                    gleamRect,
                    Color.FromArgb(45, highlightColor),
                    Color.FromArgb(0, highlightColor),
                    LinearGradientMode.Vertical))
                {
                    g.FillPath(gleamBrush, gleamPath);
                }

                // 4. Inset highlight arc along top and left
                using (Pen topPen = new Pen(Color.FromArgb(55, highlightColor), 1.6f))
                {
                    g.DrawPath(topPen, path);
                }

                // 5. Inset bottom bevel depth
                Rectangle innerShadowRect = new Rectangle(body.X + 1, body.Y + 1, body.Width - 2, body.Height - 2);
                using (GraphicsPath bPath = CreateRoundedPath(innerShadowRect, radius - 1))
                using (Pen botPen = new Pen(Color.FromArgb(35, 0, 0, 0), 1.8f))
                {
                    g.DrawPath(botPen, bPath);
                }
            }
        }
    }

    // =======================================================================
    //  CLAY BENTO CARD CONTAINER
    // =======================================================================
    public class ClayCardControl : Panel
    {
        public Color FillTop { get; set; }
        public Color FillBottom { get; set; }
        public Color ShadowColor { get; set; }
        public Color HighlightColor { get; set; }
        public int CornerRadius { get; set; }
        public int ShadowElevation { get; set; }

        public ClayCardControl()
        {
            this.SetStyle(
                ControlStyles.UserPaint |
                ControlStyles.AllPaintingInWmPaint |
                ControlStyles.OptimizedDoubleBuffer |
                ControlStyles.ResizeRedraw,
                true
            );
            this.BackColor = Color.FromArgb(13, 17, 30);
            FillTop = Color.FromArgb(28, 38, 58);
            FillBottom = Color.FromArgb(18, 26, 42);
            ShadowColor = Color.FromArgb(0, 0, 0);
            HighlightColor = Color.FromArgb(255, 255, 255);
            CornerRadius = 22;
            ShadowElevation = 6;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            using (SolidBrush bgBrush = new SolidBrush(this.Parent != null ? this.Parent.BackColor : this.BackColor))
            {
                e.Graphics.FillRectangle(bgBrush, this.ClientRectangle);
            }

            ClayGfx.DrawClayCard(
                e.Graphics,
                this.ClientRectangle,
                CornerRadius,
                FillTop,
                FillBottom,
                ShadowColor,
                ShadowElevation,
                HighlightColor
            );
        }
    }

    // =======================================================================
    //  CLAY PILL BUTTON (Tactile 3D Claymorphism Push Button)
    // =======================================================================
    public class ClayPillButton : Control
    {
        public Color ColorTop { get; set; }
        public Color ColorBottom { get; set; }
        public Color ShadowColor { get; set; }
        public int CornerRadius { get; set; }

        private bool isHovered = false;
        private bool isPressed = false;

        public ClayPillButton()
        {
            this.SetStyle(
                ControlStyles.UserPaint |
                ControlStyles.AllPaintingInWmPaint |
                ControlStyles.OptimizedDoubleBuffer |
                ControlStyles.ResizeRedraw,
                true
            );
            this.Cursor = Cursors.Hand;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            this.ForeColor = Color.White;
            ColorTop = Color.FromArgb(13, 148, 136);
            ColorBottom = Color.FromArgb(15, 118, 110);
            ShadowColor = Color.FromArgb(0, 45, 40);
            CornerRadius = 15;
        }

        protected override void OnMouseEnter(EventArgs e) { base.OnMouseEnter(e); isHovered = true; Invalidate(); }
        protected override void OnMouseLeave(EventArgs e) { base.OnMouseLeave(e); isHovered = false; isPressed = false; Invalidate(); }
        protected override void OnMouseDown(MouseEventArgs e) { base.OnMouseDown(e); if (e.Button == MouseButtons.Left) { isPressed = true; Invalidate(); } }
        protected override void OnMouseUp(MouseEventArgs e) { base.OnMouseUp(e); isPressed = false; Invalidate(); }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;

            Color parentBg = this.Parent != null ? this.Parent.BackColor : Color.FromArgb(18, 26, 42);
            using (SolidBrush bgBrush = new SolidBrush(parentBg))
            {
                g.FillRectangle(bgBrush, this.ClientRectangle);
            }

            int yOffset = isPressed ? 3 : 0;
            int shadowDepth = isPressed ? 2 : (isHovered ? 6 : 4);
            int margin = 3;

            Rectangle body = new Rectangle(
                margin,
                margin + yOffset,
                Width - (margin * 2),
                Height - (margin * 2) - 5
            );

            if (body.Width <= 4 || body.Height <= 4) return;

            // 1. Drop shadow under button
            if (!isPressed)
            {
                for (int i = 3; i >= 1; i--)
                {
                    int alpha = (i == 1) ? (isHovered ? 80 : 55) : (i == 2 ? 38 : 18);
                    int spread = i * 2;
                    Rectangle sRect = new Rectangle(
                        body.X - (spread / 2),
                        body.Y + shadowDepth + (i * 2) - 2,
                        body.Width + spread,
                        body.Height + spread
                    );
                    using (GraphicsPath sPath = ClayGfx.CreateRoundedPath(sRect, CornerRadius + (spread / 2)))
                    using (SolidBrush sb = new SolidBrush(Color.FromArgb(alpha, ShadowColor)))
                    {
                        g.FillPath(sb, sPath);
                    }
                }
            }

            // 2. Button Body Gradient
            using (GraphicsPath path = ClayGfx.CreateRoundedPath(body, CornerRadius))
            {
                Color top = isHovered ? LightenColor(ColorTop, 22) : ColorTop;
                Color bot = isHovered ? LightenColor(ColorBottom, 15) : ColorBottom;

                using (LinearGradientBrush lgb = new LinearGradientBrush(body, top, bot, LinearGradientMode.Vertical))
                {
                    g.FillPath(lgb, path);
                }

                // 3. Top Specular Gleam
                Rectangle gleamRect = new Rectangle(body.X + 2, body.Y + 2, body.Width - 4, body.Height / 2);
                using (GraphicsPath gleamPath = ClayGfx.CreateRoundedPath(gleamRect, Math.Max(2, CornerRadius - 2)))
                using (LinearGradientBrush gleamBrush = new LinearGradientBrush(
                    gleamRect,
                    Color.FromArgb(70, 255, 255, 255),
                    Color.FromArgb(0, 255, 255, 255),
                    LinearGradientMode.Vertical))
                {
                    g.FillPath(gleamBrush, gleamPath);
                }

                // 4. White Inset Highlight Stroke
                using (Pen hPen = new Pen(Color.FromArgb(50, 255, 255, 255), 1.2f))
                {
                    g.DrawPath(hPen, path);
                }

                // 5. Bottom Bevel
                using (Pen bPen = new Pen(Color.FromArgb(40, 0, 0, 0), 1.5f))
                {
                    g.DrawLine(bPen, body.X + CornerRadius, body.Bottom - 1, body.Right - CornerRadius, body.Bottom - 1);
                }
            }

            // 6. Centered Crisp Text
            Rectangle textRect = new Rectangle(body.X, body.Y, body.Width, body.Height);
            TextRenderer.DrawText(
                g,
                this.Text,
                this.Font,
                textRect,
                this.ForeColor,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine
            );
        }

        private static Color LightenColor(Color c, int amount)
        {
            return Color.FromArgb(
                c.A,
                Math.Min(255, c.R + amount),
                Math.Min(255, c.G + amount),
                Math.Min(255, c.B + amount)
            );
        }
    }

    // =======================================================================
    //  CLAY URL PILL (Interactive Rounded Capsule)
    // =======================================================================
    public class ClayUrlPill : Control
    {
        private bool isHovered = false;

        public ClayUrlPill()
        {
            this.SetStyle(
                ControlStyles.UserPaint |
                ControlStyles.AllPaintingInWmPaint |
                ControlStyles.OptimizedDoubleBuffer |
                ControlStyles.ResizeRedraw,
                true
            );
            this.Cursor = Cursors.Hand;
            this.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            this.ForeColor = Color.FromArgb(45, 212, 191);
            this.Size = new Size(185, 28);
        }

        protected override void OnMouseEnter(EventArgs e) { base.OnMouseEnter(e); isHovered = true; Invalidate(); }
        protected override void OnMouseLeave(EventArgs e) { base.OnMouseLeave(e); isHovered = false; Invalidate(); }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Color parentBg = this.Parent != null ? this.Parent.BackColor : Color.FromArgb(17, 27, 46);
            using (SolidBrush pb = new SolidBrush(parentBg))
            {
                g.FillRectangle(pb, this.ClientRectangle);
            }

            Rectangle body = new Rectangle(1, 1, Width - 3, Height - 3);
            using (GraphicsPath path = ClayGfx.CreateRoundedPath(body, 12))
            {
                Color fill = isHovered ? Color.FromArgb(16, 75, 80) : Color.FromArgb(11, 48, 54);
                using (SolidBrush fb = new SolidBrush(fill))
                {
                    g.FillPath(fb, path);
                }

                using (Pen p = new Pen(isHovered ? Color.FromArgb(45, 212, 191) : Color.FromArgb(20, 110, 100), 1.2f))
                {
                    g.DrawPath(p, path);
                }
            }

            TextRenderer.DrawText(
                g,
                this.Text,
                this.Font,
                this.ClientRectangle,
                isHovered ? Color.FromArgb(153, 246, 228) : this.ForeColor,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.SingleLine
            );
        }
    }

    // =======================================================================
    //  CLAY CONSOLE CONTROL (Zero Flicker, Emerald Monospace, Scrollable)
    // =======================================================================
    public class ClayConsole : Control
    {
        private List<string> lines = new List<string>();
        private VScrollBar vScroll;
        private int lineHeight = 17;

        public ClayConsole()
        {
            this.SetStyle(
                ControlStyles.UserPaint |
                ControlStyles.AllPaintingInWmPaint |
                ControlStyles.OptimizedDoubleBuffer |
                ControlStyles.ResizeRedraw |
                ControlStyles.Selectable,
                true
            );
            this.BackColor = Color.FromArgb(10, 14, 25);
            this.Font = new Font("Consolas", 8.5F, FontStyle.Regular);

            vScroll = new VScrollBar();
            vScroll.Dock = DockStyle.Right;
            vScroll.Width = 14;
            vScroll.Scroll += delegate { Invalidate(); };
            this.Controls.Add(vScroll);
        }

        public void AppendLine(string line)
        {
            lines.Add(line);
            UpdateScroll(true);
            Invalidate();
        }

        public void Clear()
        {
            lines.Clear();
            UpdateScroll(false);
            Invalidate();
        }

        protected override void OnMouseWheel(MouseEventArgs e)
        {
            base.OnMouseWheel(e);
            if (vScroll.Visible)
            {
                int delta = -Math.Sign(e.Delta) * 3;
                int maxVal = Math.Max(0, vScroll.Maximum - vScroll.LargeChange + 1);
                int newVal = Math.Max(0, Math.Min(maxVal, vScroll.Value + delta));
                vScroll.Value = newVal;
                Invalidate();
            }
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            UpdateScroll(false);
        }

        private void UpdateScroll(bool scrollToBottom)
        {
            int visibleLines = Math.Max(1, (Height - 8) / lineHeight);
            if (lines.Count > visibleLines)
            {
                vScroll.Visible = true;
                vScroll.Maximum = lines.Count;
                vScroll.LargeChange = visibleLines;
                if (scrollToBottom)
                {
                    vScroll.Value = Math.Max(0, lines.Count - visibleLines);
                }
            }
            else
            {
                vScroll.Visible = false;
                vScroll.Value = 0;
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.Clear(this.BackColor);

            int startLine = vScroll.Visible ? vScroll.Value : 0;
            int visibleLines = (Height / lineHeight) + 2;
            int endLine = Math.Min(lines.Count, startLine + visibleLines);

            int y = 4;
            int maxWidth = Width - (vScroll.Visible ? vScroll.Width : 0) - 10;

            for (int i = startLine; i < endLine; i++)
            {
                string text = lines[i];
                Color textColor = Color.FromArgb(74, 222, 128); // Emerald-400
                if (text.Contains("ERROR") || text.Contains("FATAL") || text.Contains("Failed"))
                    textColor = Color.FromArgb(248, 113, 113); // Coral Red
                else if (text.Contains("Warning"))
                    textColor = Color.FromArgb(251, 191, 36);  // Amber
                else if (text.Contains("==="))
                    textColor = Color.FromArgb(56, 189, 248);  // Sky Blue

                TextRenderer.DrawText(
                    g,
                    text,
                    this.Font,
                    new Rectangle(8, y, maxWidth, lineHeight),
                    textColor,
                    TextFormatFlags.NoPadding | TextFormatFlags.SingleLine | TextFormatFlags.WordEllipsis
                );
                y += lineHeight;
            }
        }
    }

    // =======================================================================
    //  MAIN LAUNCHER FORM
    // =======================================================================
    public class LauncherForm : Form
    {
        // System Tray
        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;

        // UI Displays
        private Label lblOverallStatusBadge;
        private Label lblOverallStatusText;
        private ClayUrlPill pillWebUrl;
        private Label lblNextStatus;
        private Label lblMariaStatus;
        private Label lblUptimeText;
        private ClayConsole consoleView;
        private System.Windows.Forms.Timer uptimeTimer;

        // Paths & Config
        private string installDir;
        private string nodeExe;
        private string mysqldExe;
        private string nextServerJs;
        private string dbInitJs;
        private string dbMigrateJs;
        private string programDataDir;
        private string logDir;
        private string mysqlDataDir;
        private string uploadsDir;
        private string envFile;
        private string logFile;

        private string dbHost;
        private int dbPort;
        private string dbName;
        private string dbUser;
        private string dbPassword;
        private int appPort;
        private string cookieSecure;
        private string lanIpAddress;

        // Process Management
        private Process mysqlProcess;
        private Process nextProcess;
        private Thread workerThread;
        private volatile bool isShuttingDown;
        private DateTime startTime;
        private int currentPort;
        private bool isServerRunning;

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }

        public LauncherForm()
        {
            InitializePathsAndConfig();
            BuildClaymorphicBentoUI();
            InitializeTray();

            this.FormClosing += new FormClosingEventHandler(OnFormClosing);
            StartServicesAsync();
        }

        private void InitializePathsAndConfig()
        {
            isShuttingDown = false;
            isServerRunning = false;

            string exePath = Application.ExecutablePath;
            string launcherDir = Path.GetDirectoryName(exePath);
            DirectoryInfo parent = Directory.GetParent(launcherDir);
            string candidate = (parent != null) ? parent.FullName : launcherDir;

            if (File.Exists(Path.Combine(candidate, "runtime", "node.exe")))
            {
                installDir = candidate;
            }
            else if (File.Exists(Path.Combine(launcherDir, "runtime", "node.exe")))
            {
                installDir = launcherDir;
            }
            else
            {
                string cwd = Directory.GetCurrentDirectory();
                if (File.Exists(Path.Combine(cwd, "dist", "runtime", "node.exe")))
                    installDir = Path.Combine(cwd, "dist");
                else if (File.Exists(Path.Combine(cwd, "runtime", "node.exe")))
                    installDir = cwd;
                else
                    installDir = candidate;
            }

            nodeExe = Path.Combine(installDir, "runtime", "node.exe");
            mysqldExe = Path.Combine(installDir, "runtime", "mysql", "bin", "mysqld.exe");
            nextServerJs = Path.Combine(installDir, "app", "server.js");
            dbInitJs = Path.Combine(installDir, "scripts", "db-init.js");
            dbMigrateJs = Path.Combine(installDir, "scripts", "db-migrate.js");

            string commonAppData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
            if (string.IsNullOrEmpty(commonAppData)) commonAppData = "C:\\ProgramData";

            programDataDir = Path.Combine(commonAppData, "ResidentialMasterlist");
            logDir = Path.Combine(programDataDir, "logs");
            mysqlDataDir = Path.Combine(programDataDir, "data");
            uploadsDir = Path.Combine(programDataDir, "uploads");
            envFile = Path.Combine(programDataDir, "app.env");
            logFile = Path.Combine(logDir, "launcher.log");

            EnsureDirectory(programDataDir);
            EnsureDirectory(logDir);
            EnsureDirectory(mysqlDataDir);
            EnsureDirectory(uploadsDir);

            dbHost = "127.0.0.1";
            dbPort = 33060;
            dbName = "residential_masterlist";
            dbUser = "rml_app";
            dbPassword = "RML@localhost#2024";
            appPort = 3000;
            cookieSecure = "false";

            if (File.Exists(envFile))
            {
                try
                {
                    string[] lines = File.ReadAllLines(envFile);
                    foreach (string line in lines)
                    {
                        string trimmed = line.Trim();
                        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#")) continue;
                        int eq = trimmed.IndexOf('=');
                        if (eq > 0)
                        {
                            string key = trimmed.Substring(0, eq).Trim();
                            string val = trimmed.Substring(eq + 1).Trim();
                            if (key.Equals("DB_HOST", StringComparison.OrdinalIgnoreCase)) dbHost = val;
                            else if (key.Equals("DB_PORT", StringComparison.OrdinalIgnoreCase)) int.TryParse(val, out dbPort);
                            else if (key.Equals("DB_NAME", StringComparison.OrdinalIgnoreCase)) dbName = val;
                            else if (key.Equals("DB_USER", StringComparison.OrdinalIgnoreCase)) dbUser = val;
                            else if (key.Equals("DB_PASSWORD", StringComparison.OrdinalIgnoreCase)) dbPassword = val;
                            else if (key.Equals("APP_PORT", StringComparison.OrdinalIgnoreCase)) int.TryParse(val, out appPort);
                            else if (key.Equals("COOKIE_SECURE", StringComparison.OrdinalIgnoreCase)) cookieSecure = val;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Log("Warning reading app.env: " + ex.Message);
                }
            }

            currentPort = appPort;
            lanIpAddress = GetLanIpAddress();
        }

        private void EnsureDirectory(string path)
        {
            try { if (!Directory.Exists(path)) Directory.CreateDirectory(path); } catch { }
        }

        // -------------------------------------------------------------------
        //  CLAYMORPHIC BENTO GRID UI LAYOUT
        // -------------------------------------------------------------------
        private void BuildClaymorphicBentoUI()
        {
            this.Text = "Residential Masterlist — Server Controller";
            this.ClientSize = new Size(784, 630);
            this.MinimumSize = new Size(800, 660);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(13, 17, 30); // Deep Obsidian Canvas
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;

            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
                if (File.Exists(iconPath)) this.Icon = new Icon(iconPath);
                else this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch { }

            // ── TOP HEADER ────────────────────────────────────────────────────
            Label tagPill = new Label();
            tagPill.Text = "ST. JOSEPH VILLAGE 6 PHASE 4 • OFFICIAL HOA REGISTRY";
            tagPill.Font = new Font("Segoe UI", 7.5F, FontStyle.Bold);
            tagPill.ForeColor = Color.FromArgb(45, 212, 191);
            tagPill.BackColor = Color.Transparent;
            tagPill.Location = new Point(20, 14);
            tagPill.AutoSize = true;
            this.Controls.Add(tagPill);

            Label mainTitle = new Label();
            mainTitle.Text = "Residential Masterlist Server";
            mainTitle.Font = new Font("Segoe UI", 16F, FontStyle.Bold);
            mainTitle.ForeColor = Color.FromArgb(241, 245, 249);
            mainTitle.BackColor = Color.Transparent;
            mainTitle.Location = new Point(18, 30);
            mainTitle.AutoSize = true;
            this.Controls.Add(mainTitle);

            Label verBadge = new Label();
            verBadge.Text = "v1.2.0 LAN";
            verBadge.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
            verBadge.ForeColor = Color.FromArgb(45, 212, 191);
            verBadge.BackColor = Color.FromArgb(15, 30, 45);
            verBadge.Location = new Point(340, 36);
            verBadge.Padding = new Padding(4, 1, 4, 1);
            verBadge.AutoSize = true;
            this.Controls.Add(verBadge);

            try
            {
                string pngPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.png");
                if (!File.Exists(pngPath)) pngPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ICON.png");
                if (File.Exists(pngPath))
                {
                    PictureBox pbLogo = new PictureBox();
                    pbLogo.Image = Image.FromFile(pngPath);
                    pbLogo.SizeMode = PictureBoxSizeMode.Zoom;
                    pbLogo.Location = new Point(720, 12);
                    pbLogo.Size = new Size(46, 46);
                    pbLogo.BackColor = Color.Transparent;
                    this.Controls.Add(pbLogo);
                }
            }
            catch { }

            // ── ROW 1: BENTO TRIO (Hero 376px | Services 188px | Uptime 172px) ─
            int row1Y = 70;
            int cardH = 145;

            // 1. Bento Card A: System Status Hero
            ClayCardControl cardHero = new ClayCardControl();
            cardHero.Location = new Point(16, row1Y);
            cardHero.Size = new Size(376, cardH); // Reduced back to original height
            cardHero.FillTop = Color.FromArgb(28, 42, 68);
            cardHero.FillBottom = Color.FromArgb(17, 27, 46);
            cardHero.ShadowColor = Color.FromArgb(0, 0, 0);
            cardHero.CornerRadius = 22;
            cardHero.ShadowElevation = 6;
            this.Controls.Add(cardHero);

            Label lblHeroBadge = new Label();
            lblHeroBadge.Text = "SYSTEM STATUS";
            lblHeroBadge.Font = new Font("Segoe UI", 7.5F, FontStyle.Bold);
            lblHeroBadge.ForeColor = Color.FromArgb(148, 163, 184);
            lblHeroBadge.BackColor = Color.Transparent;
            lblHeroBadge.Location = new Point(18, 16);
            lblHeroBadge.AutoSize = true;
            cardHero.Controls.Add(lblHeroBadge);

            lblOverallStatusBadge = new Label();
            lblOverallStatusBadge.Text = "● STARTING SERVICES";
            lblOverallStatusBadge.Font = new Font("Segoe UI", 12.5F, FontStyle.Bold);
            lblOverallStatusBadge.ForeColor = Color.FromArgb(245, 158, 11);
            lblOverallStatusBadge.BackColor = Color.Transparent;
            lblOverallStatusBadge.Location = new Point(16, 36);
            lblOverallStatusBadge.AutoSize = true;
            cardHero.Controls.Add(lblOverallStatusBadge);

            lblOverallStatusText = new Label();
            lblOverallStatusText.Text = "Initialising local MariaDB and Next.js daemon...";
            lblOverallStatusText.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
            lblOverallStatusText.ForeColor = Color.FromArgb(203, 213, 225);
            lblOverallStatusText.BackColor = Color.Transparent;
            lblOverallStatusText.Location = new Point(18, 64);
            lblOverallStatusText.Size = new Size(335, 30);
            cardHero.Controls.Add(lblOverallStatusText);

            // Custom Rounded Clay URL Pill Button (LAN URL)
            pillWebUrl = new ClayUrlPill();
            pillWebUrl.Text = "LAN: Detecting...";
            pillWebUrl.Location = new Point(18, 98);
            pillWebUrl.Size = new Size(185, 28);
            pillWebUrl.Click += new EventHandler(BtnOpenBrowser_Click);
            cardHero.Controls.Add(pillWebUrl);

            // 2. Bento Card B: Services Stack
            ClayCardControl cardStack = new ClayCardControl();
            cardStack.Location = new Point(400, row1Y);
            cardStack.Size = new Size(188, cardH);
            cardStack.FillTop = Color.FromArgb(30, 41, 59);
            cardStack.FillBottom = Color.FromArgb(20, 29, 43);
            cardStack.ShadowColor = Color.FromArgb(0, 0, 0);
            cardStack.CornerRadius = 22;
            cardStack.ShadowElevation = 6;
            this.Controls.Add(cardStack);

            Label lblStackTitle = new Label();
            lblStackTitle.Text = "SERVICES";
            lblStackTitle.Font = new Font("Segoe UI", 7.5F, FontStyle.Bold);
            lblStackTitle.ForeColor = Color.FromArgb(148, 163, 184);
            lblStackTitle.BackColor = Color.Transparent;
            lblStackTitle.Location = new Point(16, 16);
            lblStackTitle.AutoSize = true;
            cardStack.Controls.Add(lblStackTitle);

            Label lblWebHeader = new Label();
            lblWebHeader.Text = "Next.js Web Engine";
            lblWebHeader.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
            lblWebHeader.ForeColor = Color.FromArgb(241, 245, 249);
            lblWebHeader.BackColor = Color.Transparent;
            lblWebHeader.Location = new Point(16, 38);
            lblWebHeader.AutoSize = true;
            cardStack.Controls.Add(lblWebHeader);

            lblNextStatus = new Label();
            lblNextStatus.Text = "● Port 3000 (Standby)";
            lblNextStatus.Font = new Font("Segoe UI", 7.5F, FontStyle.Regular);
            lblNextStatus.ForeColor = Color.FromArgb(245, 158, 11);
            lblNextStatus.BackColor = Color.Transparent;
            lblNextStatus.Location = new Point(16, 54);
            lblNextStatus.AutoSize = true;
            cardStack.Controls.Add(lblNextStatus);

            Label lblDbHeader = new Label();
            lblDbHeader.Text = "MariaDB 10.11";
            lblDbHeader.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
            lblDbHeader.ForeColor = Color.FromArgb(241, 245, 249);
            lblDbHeader.BackColor = Color.Transparent;
            lblDbHeader.Location = new Point(16, 82);
            lblDbHeader.AutoSize = true;
            cardStack.Controls.Add(lblDbHeader);

            lblMariaStatus = new Label();
            lblMariaStatus.Text = "● Port 33060 (Standby)";
            lblMariaStatus.Font = new Font("Segoe UI", 7.5F, FontStyle.Regular);
            lblMariaStatus.ForeColor = Color.FromArgb(245, 158, 11);
            lblMariaStatus.BackColor = Color.Transparent;
            lblMariaStatus.Location = new Point(16, 98);
            lblMariaStatus.AutoSize = true;
            cardStack.Controls.Add(lblMariaStatus);

            // 3. Bento Card C: Uptime Counter
            ClayCardControl cardUptime = new ClayCardControl();
            cardUptime.Location = new Point(596, row1Y);
            cardUptime.Size = new Size(172, cardH);
            cardUptime.FillTop = Color.FromArgb(10, 68, 64);
            cardUptime.FillBottom = Color.FromArgb(6, 42, 40);
            cardUptime.ShadowColor = Color.FromArgb(0, 40, 36);
            cardUptime.CornerRadius = 22;
            cardUptime.ShadowElevation = 6;
            this.Controls.Add(cardUptime);

            Label lblUptimeTitle = new Label();
            lblUptimeTitle.Text = "SERVER UPTIME";
            lblUptimeTitle.Font = new Font("Segoe UI", 7.5F, FontStyle.Bold);
            lblUptimeTitle.ForeColor = Color.FromArgb(94, 234, 212);
            lblUptimeTitle.BackColor = Color.Transparent;
            lblUptimeTitle.Location = new Point(16, 16);
            lblUptimeTitle.AutoSize = true;
            cardUptime.Controls.Add(lblUptimeTitle);

            lblUptimeText = new Label();
            lblUptimeText.Text = "00:00:00";
            lblUptimeText.Font = new Font("Segoe UI", 18F, FontStyle.Bold);
            lblUptimeText.ForeColor = Color.White;
            lblUptimeText.BackColor = Color.Transparent;
            lblUptimeText.Location = new Point(14, 38);
            lblUptimeText.AutoSize = true;
            cardUptime.Controls.Add(lblUptimeText);

            Label lblMode = new Label();
            lblMode.Text = "Standalone Offline\nWindows Runtime";
            lblMode.Font = new Font("Segoe UI", 7.5F, FontStyle.Regular);
            lblMode.ForeColor = Color.FromArgb(94, 234, 212);
            lblMode.BackColor = Color.Transparent;
            lblMode.Location = new Point(16, 82);
            lblMode.Size = new Size(140, 32);
            cardUptime.Controls.Add(lblMode);

            // ── ROW 2: ACTION BUTTONS TRAY ────────────────────────────────────
            int row2Y = row1Y + cardH + 12;
            ClayCardControl cardActions = new ClayCardControl();
            cardActions.Location = new Point(16, row2Y);
            cardActions.Size = new Size(752, 76);
            cardActions.FillTop = Color.FromArgb(24, 32, 50);
            cardActions.FillBottom = Color.FromArgb(16, 23, 38);
            cardActions.ShadowColor = Color.FromArgb(0, 0, 0);
            cardActions.CornerRadius = 20;
            cardActions.ShadowElevation = 5;
            this.Controls.Add(cardActions);

            int bY = 14;
            int bH = 46;
            int bGap = 10;
            int bX = 14;

            // 1. Primary Open Web App (Teal)
            ClayPillButton btnOpen = new ClayPillButton();
            btnOpen.Text = "Open Web App ↗";
            btnOpen.Location = new Point(bX, bY);
            btnOpen.Size = new Size(150, bH);
            btnOpen.ColorTop = Color.FromArgb(13, 148, 136);
            btnOpen.ColorBottom = Color.FromArgb(15, 118, 110);
            btnOpen.ShadowColor = Color.FromArgb(0, 50, 45);
            btnOpen.Click += new EventHandler(BtnOpenBrowser_Click);
            cardActions.Controls.Add(btnOpen);
            bX += 150 + bGap;

            // 2. Restart Services (Slate)
            ClayPillButton btnRestart = new ClayPillButton();
            btnRestart.Text = "Restart Services";
            btnRestart.Location = new Point(bX, bY);
            btnRestart.Size = new Size(130, bH);
            btnRestart.ColorTop = Color.FromArgb(51, 65, 85);
            btnRestart.ColorBottom = Color.FromArgb(30, 41, 59);
            btnRestart.ShadowColor = Color.FromArgb(0, 0, 0);
            btnRestart.Click += new EventHandler(BtnRestart_Click);
            cardActions.Controls.Add(btnRestart);
            bX += 130 + bGap;

            // 3. View Logs (Slate)
            ClayPillButton btnLogs = new ClayPillButton();
            btnLogs.Text = "View Logs";
            btnLogs.Location = new Point(bX, bY);
            btnLogs.Size = new Size(130, bH);
            btnLogs.ColorTop = Color.FromArgb(51, 65, 85);
            btnLogs.ColorBottom = Color.FromArgb(30, 41, 59);
            btnLogs.ShadowColor = Color.FromArgb(0, 0, 0);
            btnLogs.Click += new EventHandler(BtnOpenLogs_Click);
            cardActions.Controls.Add(btnLogs);
            bX += 130 + bGap;

            // 4. Hide to Tray (Slate)
            ClayPillButton btnHide = new ClayPillButton();
            btnHide.Text = "Hide to Tray";
            btnHide.Location = new Point(bX, bY);
            btnHide.Size = new Size(136, bH);
            btnHide.ColorTop = Color.FromArgb(51, 65, 85);
            btnHide.ColorBottom = Color.FromArgb(30, 41, 59);
            btnHide.ShadowColor = Color.FromArgb(0, 0, 0);
            btnHide.Click += new EventHandler(delegate(object s, EventArgs e) { HideToTray(); });
            cardActions.Controls.Add(btnHide);
            bX += 136 + bGap;

            // 5. Exit Server (Red)
            ClayPillButton btnExit = new ClayPillButton();
            btnExit.Text = "Exit Server";
            btnExit.Location = new Point(bX, bY);
            btnExit.Size = new Size(130, bH);
            btnExit.ColorTop = Color.FromArgb(220, 38, 38);
            btnExit.ColorBottom = Color.FromArgb(153, 27, 27);
            btnExit.ShadowColor = Color.FromArgb(70, 0, 0);
            btnExit.Click += new EventHandler(BtnExit_Click);
            cardActions.Controls.Add(btnExit);

            // ── ROW 3: LIVE CONSOLE ───────────────────────────────────────────
            int row3Y = row2Y + 76 + 12;
            int consoleH = this.ClientSize.Height - row3Y - 14;

            ClayCardControl cardLogs = new ClayCardControl();
            cardLogs.Location = new Point(16, row3Y);
            cardLogs.Size = new Size(752, consoleH);
            cardLogs.FillTop = Color.FromArgb(15, 20, 34);
            cardLogs.FillBottom = Color.FromArgb(10, 14, 25);
            cardLogs.ShadowColor = Color.FromArgb(0, 0, 0);
            cardLogs.CornerRadius = 20;
            cardLogs.ShadowElevation = 5;
            this.Controls.Add(cardLogs);

            Label lblLogTitle = new Label();
            lblLogTitle.Text = "LIVE ACTIVITY CONSOLE";
            lblLogTitle.Font = new Font("Segoe UI", 7.5F, FontStyle.Bold);
            lblLogTitle.ForeColor = Color.FromArgb(45, 212, 191);
            lblLogTitle.BackColor = Color.Transparent;
            lblLogTitle.Location = new Point(18, 14);
            lblLogTitle.AutoSize = true;
            cardLogs.Controls.Add(lblLogTitle);

            Label btnClearLogs = new Label();
            btnClearLogs.Text = "Clear Console";
            btnClearLogs.Font = new Font("Segoe UI", 7.5F, FontStyle.Bold);
            btnClearLogs.ForeColor = Color.FromArgb(100, 116, 139);
            btnClearLogs.BackColor = Color.Transparent;
            btnClearLogs.Location = new Point(650, 14);
            btnClearLogs.AutoSize = true;
            btnClearLogs.Cursor = Cursors.Hand;
            btnClearLogs.Click += new EventHandler(delegate(object s, EventArgs e) { consoleView.Clear(); });
            cardLogs.Controls.Add(btnClearLogs);

            consoleView = new ClayConsole();
            consoleView.Name = "consoleView";
            consoleView.Location = new Point(16, 36);
            consoleView.Size = new Size(720, consoleH - 50);
            cardLogs.Controls.Add(consoleView);

            // Uptime timer
            uptimeTimer = new System.Windows.Forms.Timer();
            uptimeTimer.Interval = 1000;
            uptimeTimer.Tick += new EventHandler(UptimeTimer_Tick);
        }

        // -------------------------------------------------------------------
        //  SYSTEM TRAY
        // -------------------------------------------------------------------
        private void InitializeTray()
        {
            trayMenu = new ContextMenuStrip();

            ToolStripMenuItem menuOpen = new ToolStripMenuItem("Open in Browser");
            menuOpen.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            menuOpen.Click += new EventHandler(BtnOpenBrowser_Click);
            trayMenu.Items.Add(menuOpen);

            ToolStripMenuItem menuShow = new ToolStripMenuItem("Show Server Control Panel");
            menuShow.Click += new EventHandler(delegate(object s, EventArgs e) { ShowWindow(); });
            trayMenu.Items.Add(menuShow);

            ToolStripMenuItem menuLogs = new ToolStripMenuItem("Open Logs Folder");
            menuLogs.Click += new EventHandler(BtnOpenLogs_Click);
            trayMenu.Items.Add(menuLogs);

            trayMenu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem menuRestart = new ToolStripMenuItem("Restart Services");
            menuRestart.Click += new EventHandler(BtnRestart_Click);
            trayMenu.Items.Add(menuRestart);

            ToolStripMenuItem menuExit = new ToolStripMenuItem("Exit & Stop Server");
            menuExit.Click += new EventHandler(BtnExit_Click);
            trayMenu.Items.Add(menuExit);

            trayIcon = new NotifyIcon();
            trayIcon.Text = "Residential Masterlist Server";
            trayIcon.Icon = this.Icon;
            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += new EventHandler(delegate(object s, EventArgs e) { OpenBrowser(); });
        }

        private void HideToTray()
        {
            this.Hide();
            if (isServerRunning)
            {
                trayIcon.ShowBalloonTip(
                    3000,
                    "Residential Masterlist",
                    string.Format("Server is running at http://127.0.0.1:{0}\nDouble-click tray icon to open.", currentPort),
                    ToolTipIcon.Info
                );
            }
        }

        private void ShowWindow()
        {
            this.Show();
            this.WindowState = FormWindowState.Normal;
            this.BringToFront();
            this.Activate();
        }

        private void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            if (isShuttingDown) return;

            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                HideToTray();
            }
            else
            {
                Shutdown(0);
            }
        }

        // -------------------------------------------------------------------
        //  LOGGING & THREAD-SAFE UI UPDATES
        // -------------------------------------------------------------------
        private void Log(string message)
        {
            string ts = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            string line = string.Format("[{0}] {1}", ts, message);

            try
            {
                File.AppendAllText(logFile, line + Environment.NewLine);
            }
            catch { }

            if (consoleView.InvokeRequired)
            {
                consoleView.BeginInvoke(new Action<string>(AppendLogText), line);
            }
            else
            {
                AppendLogText(line);
            }
        }

        private void AppendLogText(string line)
        {
            consoleView.AppendLine(line);
        }

        private void UptimeTimer_Tick(object sender, EventArgs e)
        {
            TimeSpan elapsed = DateTime.Now - startTime;
            lblUptimeText.Text = string.Format("{0:D2}:{1:D2}:{2:D2}", (int)elapsed.TotalHours, elapsed.Minutes, elapsed.Seconds);
        }

        // -------------------------------------------------------------------
        //  ASYNCHRONOUS SERVICE STARTUP
        // -------------------------------------------------------------------
        private void StartServicesAsync()
        {
            workerThread = new Thread(new ThreadStart(RunServicesWorker));
            workerThread.IsBackground = true;
            workerThread.Start();
        }

        private void RunServicesWorker()
        {
            try
            {
                Log("=== Residential Masterlist Server Starting ===");
                Log("Install path: " + installDir);
                Log("Data path:    " + programDataDir);

                ValidateRequiredFiles();

                currentPort = FindFreePort(appPort, appPort + 10);
                if (currentPort <= 0)
                {
                    throw new Exception(string.Format("No free port available between {0} and {1}.", appPort, appPort + 10));
                }
                Log(string.Format("Web application port assigned: {0}", currentPort));

                StartMariaDB();
                RunDbInit();
                StartNextServer(currentPort);
                WaitForHttpServer(currentPort, 90000);

                isServerRunning = true;
                startTime = DateTime.Now;

                this.BeginInvoke(new Action(delegate()
                {
                    lblOverallStatusBadge.Text = "● SYSTEM ONLINE";
                    lblOverallStatusBadge.ForeColor = Color.FromArgb(52, 211, 153); // Emerald-400
                    lblOverallStatusText.Text = "All services operational. Registry database connected.";

                    // Show LAN URL in button if available, otherwise show localhost
                    if (!string.IsNullOrEmpty(lanIpAddress))
                    {
                        pillWebUrl.Text = string.Format("LAN: {0}:{1} ↗", lanIpAddress, currentPort);
                        lblOverallStatusText.Text += string.Format(" | Local: 127.0.0.1:{0}", currentPort);
                    }
                    else
                    {
                        pillWebUrl.Text = string.Format("Local: 127.0.0.1:{0} ↗", currentPort);
                    }
                    pillWebUrl.Invalidate();

                    lblNextStatus.Text = string.Format("● Port {0} (Active)", currentPort);
                    lblNextStatus.ForeColor = Color.FromArgb(52, 211, 153);

                    lblMariaStatus.Text = string.Format("● Port {0} (Connected)", dbPort);
                    lblMariaStatus.ForeColor = Color.FromArgb(52, 211, 153);

                    uptimeTimer.Start();
                    trayIcon.Text = string.Format("Residential Masterlist (:{0})", currentPort);
                    
                    string balloonMessage;
                    if (!string.IsNullOrEmpty(lanIpAddress))
                    {
                        balloonMessage = string.Format("Server is online at http://{0}:{1}", lanIpAddress, currentPort);
                    }
                    else
                    {
                        balloonMessage = string.Format("Server is online at http://127.0.0.1:{0}", currentPort);
                    }
                    
                    trayIcon.ShowBalloonTip(
                        3000,
                        "Residential Masterlist Ready",
                        balloonMessage,
                        ToolTipIcon.Info
                    );
                }));

                string logMessage;
                if (!string.IsNullOrEmpty(lanIpAddress))
                {
                    logMessage = string.Format("=== Server fully operational at http://{0}:{1} ===", lanIpAddress, currentPort);
                }
                else
                {
                    logMessage = string.Format("=== Server fully operational at http://127.0.0.1:{0} ===", currentPort);
                }
                Log(logMessage);
                OpenBrowser();
            }
            catch (Exception ex)
            {
                if (isShuttingDown) return;
                Log("FATAL ERROR: " + ex.Message);

                this.BeginInvoke(new Action(delegate()
                {
                    lblOverallStatusBadge.Text = "● STARTUP FAILED";
                    lblOverallStatusBadge.ForeColor = Color.FromArgb(239, 68, 68);
                    lblOverallStatusText.Text = ex.Message;
                }));

                MessageBox.Show(
                    string.Format("Failed to start services:\n{0}\n\nPlease inspect the logs in {1}", ex.Message, logDir),
                    "Residential Masterlist — Server Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void ValidateRequiredFiles()
        {
            string[] required = new string[] { nodeExe, mysqldExe, nextServerJs, dbInitJs, dbMigrateJs };
            foreach (string file in required)
            {
                if (!File.Exists(file))
                {
                    throw new FileNotFoundException(string.Format("Missing essential component: {0}\nPlease reinstall the application.", file));
                }
            }
        }

        private int FindFreePort(int start, int end)
        {
            for (int p = start; p <= end; p++)
            {
                TcpListener listener = null;
                try
                {
                    listener = new TcpListener(IPAddress.Loopback, p);
                    listener.Start();
                    listener.Stop();
                    return p;
                }
                catch
                {
                    if (listener != null) listener.Stop();
                }
            }
            return -1;
        }

        private string GetLanIpAddress()
        {
            try
            {
                string hostName = Dns.GetHostName();
                IPAddress[] addresses = Dns.GetHostEntry(hostName).AddressList;
                
                foreach (IPAddress address in addresses)
                {
                    // Look for IPv4 addresses that are not loopback
                    if (address.AddressFamily == AddressFamily.InterNetwork && 
                        !IPAddress.IsLoopback(address))
                    {
                        // Prefer addresses in common private ranges
                        byte[] bytes = address.GetAddressBytes();
                        if (bytes[0] == 192 && bytes[1] == 168) // 192.168.x.x
                            return address.ToString();
                        if (bytes[0] == 10) // 10.x.x.x
                            return address.ToString();
                        if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) // 172.16-31.x.x
                            return address.ToString();
                    }
                }
                
                // Fallback to first non-loopback IPv4
                foreach (IPAddress address in addresses)
                {
                    if (address.AddressFamily == AddressFamily.InterNetwork && 
                        !IPAddress.IsLoopback(address))
                    {
                        return address.ToString();
                    }
                }
            }
            catch (Exception ex)
            {
                Log("Warning: Could not detect LAN IP: " + ex.Message);
            }
            return null;
        }

        private void StartMariaDB()
        {
            Log("Configuring MariaDB...");
            string iniPath = Path.Combine(programDataDir, "my.ini");
            string mysqlDir = Path.Combine(installDir, "runtime", "mysql");

            string iniContent = string.Format(
                "[mysqld]\r\n" +
                "port = {0}\r\n" +
                "datadir = {1}\r\n" +
                "basedir = {2}\r\n" +
                "bind-address = 127.0.0.1\r\n" +
                "default-storage-engine = InnoDB\r\n" +
                "character-set-server = utf8mb4\r\n" +
                "collation-server = utf8mb4_unicode_ci\r\n" +
                "max_allowed_packet = 64M\r\n" +
                "innodb_buffer_pool_size = 64M\r\n" +
                "skip-networking = 0\r\n" +
                "skip-name-resolve\r\n" +
                "log_error = {3}\r\n\r\n" +
                "[client]\r\n" +
                "port = {0}\r\n" +
                "default-character-set = utf8mb4\r\n",
                dbPort,
                mysqlDataDir.Replace('\\', '/'),
                mysqlDir.Replace('\\', '/'),
                Path.Combine(logDir, "mysql.log").Replace('\\', '/')
            );
            File.WriteAllText(iniPath, iniContent);

            string markerFile = Path.Combine(mysqlDataDir, "ibdata1");
            if (!File.Exists(markerFile))
            {
                Log("First-run: Initialising MariaDB data directory...");
                string mysqlBin = Path.Combine(mysqlDir, "bin");
                string installerExe = Path.Combine(mysqlBin, "mariadb-install-db.exe");
                if (!File.Exists(installerExe)) installerExe = Path.Combine(mysqlBin, "mysql_install_db.exe");

                ProcessStartInfo psiInit = new ProcessStartInfo();
                if (File.Exists(installerExe))
                {
                    psiInit.FileName = installerExe;
                    psiInit.Arguments = string.Format("--datadir=\"{0}\" --port={1} --password= --silent", mysqlDataDir, dbPort);
                }
                else
                {
                    psiInit.FileName = mysqldExe;
                    psiInit.Arguments = string.Format("--defaults-file=\"{0}\" --initialize-insecure --datadir=\"{1}\"", iniPath, mysqlDataDir);
                }
                psiInit.CreateNoWindow = true;
                psiInit.UseShellExecute = false;

                using (Process pInit = Process.Start(psiInit))
                {
                    if (!pInit.WaitForExit(120000))
                    {
                        pInit.Kill();
                        throw new TimeoutException("MariaDB initialisation timed out.");
                    }
                }
                Log("MariaDB data directory ready.");
            }

            Log(string.Format("Launching MariaDB on 127.0.0.1:{0}...", dbPort));
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = mysqldExe;
            psi.Arguments = string.Format("--defaults-file=\"{0}\"", iniPath);
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;

            mysqlProcess = Process.Start(psi);

            WaitForTcpPort(dbHost, dbPort, 60000);
            Log("MariaDB is online and listening.");
        }

        private void WaitForTcpPort(string host, int port, int timeoutMs)
        {
            DateTime deadline = DateTime.Now.AddMilliseconds(timeoutMs);
            while (DateTime.Now < deadline)
            {
                if (isShuttingDown) return;
                try
                {
                    using (TcpClient client = new TcpClient())
                    {
                        IAsyncResult res = client.BeginConnect(host, port, null, null);
                        bool success = res.AsyncWaitHandle.WaitOne(500);
                        if (success && client.Connected)
                        {
                            client.EndConnect(res);
                            return;
                        }
                    }
                }
                catch { }
                Thread.Sleep(400);
            }
            throw new TimeoutException(string.Format("Database did not respond on {0}:{1} within {2}s.", host, port, timeoutMs / 1000));
        }

        private void RunDbInit()
        {
            Log("Running database setup & migrations...");
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodeExe;
            psi.Arguments = string.Format("\"{0}\"", dbInitJs);
            psi.WorkingDirectory = Path.GetDirectoryName(dbInitJs);
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;

            psi.EnvironmentVariables["RML_DATA_DIR"] = programDataDir;
            psi.EnvironmentVariables["DB_HOST"] = dbHost;
            psi.EnvironmentVariables["DB_PORT"] = dbPort.ToString();
            psi.EnvironmentVariables["DB_NAME"] = dbName;
            psi.EnvironmentVariables["DB_USER"] = dbUser;
            psi.EnvironmentVariables["DB_PASSWORD"] = dbPassword;
            psi.EnvironmentVariables["DB_ROOT_PASSWORD"] = "";

            using (Process pInit = Process.Start(psi))
            {
                if (!pInit.WaitForExit(90000))
                {
                    pInit.Kill();
                    throw new TimeoutException("Database initialisation script (db-init.js) timed out.");
                }
                if (pInit.ExitCode != 0)
                {
                    throw new Exception(string.Format("db-init.js failed with exit code {0}.", pInit.ExitCode));
                }
            }
            Log("Database initialisation complete.");
            
            // Run database migrations for existing installations
            RunDbMigrations();
        }

        private void RunDbMigrations()
        {
            Log("Running database migrations for existing installations...");
            
            if (!File.Exists(dbMigrateJs))
            {
                Log("Migration script not found - skipping migrations.");
                return;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodeExe;
                psi.Arguments = string.Format("\"{0}\"", dbMigrateJs);
                psi.WorkingDirectory = Path.GetDirectoryName(dbMigrateJs);
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;

                psi.EnvironmentVariables["RML_DATA_DIR"] = programDataDir;
                psi.EnvironmentVariables["DB_HOST"] = dbHost;
                psi.EnvironmentVariables["DB_PORT"] = dbPort.ToString();
                psi.EnvironmentVariables["DB_NAME"] = dbName;
                psi.EnvironmentVariables["DB_USER"] = dbUser;
                psi.EnvironmentVariables["DB_PASSWORD"] = dbPassword;

                using (Process pMigrate = Process.Start(psi))
                {
                    if (!pMigrate.WaitForExit(60000))
                    {
                        pMigrate.Kill();
                        Log("Migration script timed out - continuing anyway.");
                        return;
                    }
                    
                    if (pMigrate.ExitCode == 0)
                    {
                        Log("Database migrations completed successfully or already applied.");
                    }
                    else
                    {
                        Log(string.Format("Migration script exited with code {0} - continuing anyway.", pMigrate.ExitCode));
                    }
                }
            }
            catch (Exception ex)
            {
                Log(string.Format("Migration failed with error: {0} - continuing anyway.", ex.Message));
            }
        }

        private void StartNextServer(int port)
        {
            Log(string.Format("Launching Next.js server on port {0}...", port));
            string appDir = Path.Combine(installDir, "app");

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodeExe;
            psi.Arguments = string.Format("\"{0}\"", nextServerJs);
            psi.WorkingDirectory = appDir;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;

            psi.EnvironmentVariables["NODE_ENV"] = "production";
            psi.EnvironmentVariables["PORT"] = port.ToString();
            psi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";
            psi.EnvironmentVariables["DB_HOST"] = dbHost;
            psi.EnvironmentVariables["DB_PORT"] = dbPort.ToString();
            psi.EnvironmentVariables["DB_NAME"] = dbName;
            psi.EnvironmentVariables["DB_USER"] = dbUser;
            psi.EnvironmentVariables["DB_PASSWORD"] = dbPassword;
            psi.EnvironmentVariables["DB_CONNECTION_LIMIT"] = "10";
            psi.EnvironmentVariables["UPLOAD_DIR"] = uploadsDir;
            psi.EnvironmentVariables["COOKIE_SECURE"] = cookieSecure;

            nextProcess = Process.Start(psi);
        }

        private void WaitForHttpServer(int port, int timeoutMs)
        {
            Log(string.Format("Waiting for HTTP response on port {0}...", port));
            DateTime deadline = DateTime.Now.AddMilliseconds(timeoutMs);
            string url = string.Format("http://127.0.0.1:{0}/", port);

            while (DateTime.Now < deadline)
            {
                if (isShuttingDown) return;
                try
                {
                    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                    request.Timeout = 1200;
                    request.Method = "GET";
                    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                    {
                        if ((int)response.StatusCode < 500)
                        {
                            return;
                        }
                    }
                }
                catch
                {
                }
                Thread.Sleep(800);
            }
            throw new TimeoutException(string.Format("Next.js web server did not respond within {0}s.", timeoutMs / 1000));
        }

        // -------------------------------------------------------------------
        //  USER ACTIONS
        // -------------------------------------------------------------------
        private void OpenBrowser()
        {
            try
            {
                string url;
                // Open LAN URL if available, otherwise fallback to localhost
                if (!string.IsNullOrEmpty(lanIpAddress))
                {
                    url = string.Format("http://{0}:{1}", lanIpAddress, currentPort);
                }
                else
                {
                    url = string.Format("http://127.0.0.1:{0}", currentPort);
                }
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                Log("Failed to open browser: " + ex.Message);
            }
        }

        private void BtnOpenBrowser_Click(object sender, EventArgs e)
        {
            OpenBrowser();
        }

        private void BtnOpenLogs_Click(object sender, EventArgs e)
        {
            try
            {
                if (Directory.Exists(logDir))
                {
                    Process.Start(new ProcessStartInfo("explorer.exe", logDir) { UseShellExecute = true });
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Unable to open logs folder: " + ex.Message);
            }
        }

        private void BtnRestart_Click(object sender, EventArgs e)
        {
            if (MessageBox.Show("Restart all background services?", "Restart Services", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            {
                return;
            }

            Log("Restarting services by user request...");
            uptimeTimer.Stop();
            isServerRunning = false;
            StopProcesses();

            this.BeginInvoke(new Action(delegate()
            {
                lblOverallStatusBadge.Text = "● RESTARTING";
                lblOverallStatusBadge.ForeColor = Color.FromArgb(245, 158, 11);
                lblNextStatus.Text = "● Restarting...";
                lblNextStatus.ForeColor = Color.FromArgb(245, 158, 11);
                lblMariaStatus.Text = "● Restarting...";
                lblMariaStatus.ForeColor = Color.FromArgb(245, 158, 11);
            }));

            StartServicesAsync();
        }

        private void BtnExit_Click(object sender, EventArgs e)
        {
            if (MessageBox.Show("Stop server and exit Residential Masterlist?", "Confirm Exit", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
            {
                Shutdown(0);
            }
        }

        private void StopProcesses()
        {
            if (nextProcess != null && !nextProcess.HasExited)
            {
                try { nextProcess.Kill(); nextProcess.WaitForExit(3000); } catch { }
                nextProcess = null;
            }

            if (mysqlProcess != null && !mysqlProcess.HasExited)
            {
                try { mysqlProcess.Kill(); mysqlProcess.WaitForExit(5000); } catch { }
                mysqlProcess = null;
            }
        }

        private void Shutdown(int exitCode)
        {
            if (isShuttingDown) return;
            isShuttingDown = true;

            Log("Shutting down services...");
            if (trayIcon != null) trayIcon.Visible = false;

            StopProcesses();
            Log("Shutdown complete.");

            Environment.Exit(exitCode);
        }
    }
}
