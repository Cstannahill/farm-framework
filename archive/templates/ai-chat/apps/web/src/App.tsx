import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { ChatWindow } from "./components/chat/ChatWindow";
import { useConversations } from "./hooks/useConversations";
import { useChatStore } from "./stores/chatStore";
import { useAIProviders } from "./hooks/useAIProviders";

/* ------------------------------------------------------------------ */
/* Animation variants */
/* ------------------------------------------------------------------ */
const sidebarVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      mass: 0.8,
      duration: 0.4,
    },
  },
  closed: {
    x: -320,
    opacity: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      mass: 0.6,
      duration: 0.3,
    },
  },
};

const mainContentVariants = {
  sidebarOpen: {
    marginLeft: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.4,
    },
  },
  sidebarClosed: {
    marginLeft: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.3,
    },
  },
};

const backgroundVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const loadingVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 1.05,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

const floatingButtonVariants = {
  initial: { opacity: 0, scale: 0, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300,
      delay: 0.2,
    },
  },
  exit: {
    opacity: 0,
    scale: 0,
    y: 20,
    transition: { duration: 0.2 },
  },
  hover: {
    scale: 1.05,
    transition: { type: "spring", damping: 20, stiffness: 400 },
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};

/* ------------------------------------------------------------------ */
/* App */
/* ------------------------------------------------------------------ */
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { currentConversationId, setCurrentConversationId } = useChatStore();
  const { healthCheck } = useAIProviders();
  const shouldReduceMotion = useReducedMotion();

  /* -------------------------------------------------------------- */
  /* Initialise */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await healthCheck(); // verify AI providers

        // simulate splash
        await new Promise((resolve) => setTimeout(resolve, 800));

        setIsLoading(false);
        setMounted(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setIsLoading(false);
        setMounted(true);
      }
    };

    initializeApp();
  }, [healthCheck]);

  /* -------------------------------------------------------------- */
  /* Handle resize / mobile */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else if (width > 1280) {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* -------------------------------------------------------------- */
  /* Keyboard shortcuts */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: WindowEventMap["keydown"]) => {
      // ignore when typing
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as Element)?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      // toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((open) => !open);
      }

      // new conversation
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setCurrentConversationId(null);
      }

      // close sidebar on mobile
      if (e.key === "Escape" && isMobile && sidebarOpen) {
        e.preventDefault();
        setSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, setCurrentConversationId, isMobile]);

  /* -------------------------------------------------------------- */
  /* Loading screen */
  /* -------------------------------------------------------------- */
  if (isLoading || !mounted) {
    return (
      <motion.div
        className="flex h-screen items-center justify-center bg-background"
        variants={loadingVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.1) 100%)",
        }}
      >
        <div className="flex flex-col items-center gap-6">
          {/* spinner */}
          <motion.div
            className="relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full" />
            <motion.div
              className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-primary/40 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          {/* text + dots */}
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-foreground gradient-text">
              Initializing AI Chat
            </h2>
            <p className="text-sm text-muted-foreground">
              Setting up your experience…
            </p>

            <div className="flex gap-1 mt-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  /* eslint-disable react/no-array-index-key */ key={i}
                  className="w-2 h-2 bg-primary/60 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Main UI */
  /* -------------------------------------------------------------- */
  return (
    <motion.div
      className="flex h-screen bg-background overflow-hidden"
      variants={backgroundVariants}
      initial="initial"
      animate="animate"
    >
      {/* background accents */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01] pointer-events-none" />

      {/* ---------------------------------------------------------------- */}
      {/* Sidebar */}
      {/* ---------------------------------------------------------------- */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            className="relative z-10 w-80 flex-shrink-0"
            variants={shouldReduceMotion ? undefined : sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="h-full premium-sidebar border-r border-border/50 shadow-xl">
              <div className="absolute inset-0 bg-card/90 backdrop-blur-xl" />
              <div className="absolute inset-0 bg-gradient-to-b from-card/50 via-transparent to-muted/20 pointer-events-none" />

              <div className="relative z-10 h-full">
                <Sidebar
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  onSelectConversation={setCurrentConversationId}
                  onNewConversation={() => setCurrentConversationId(null)}
                  isLoading={conversationsLoading}
                />
              </div>

              <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
              <div className="absolute inset-0 shadow-inner pointer-events-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------------- */}
      {/* Main content */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        className="flex-1 flex flex-col min-w-0"
        variants={shouldReduceMotion ? undefined : mainContentVariants}
        animate={sidebarOpen ? "sidebarOpen" : "sidebarClosed"}
      >
        {/* header */}
        <motion.div
          className="relative z-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="premium-header border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-20" />
            <div className="relative z-10">
              <Header
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              />
            </div>
          </div>
        </motion.div>

        {/* chat pane */}
        <motion.main
          className="flex-1 overflow-hidden relative chat-container"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-muted/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tl from-primary/[0.01] via-transparent to-accent/[0.01] pointer-events-none" />

          <div className="relative z-10 h-full">
            <ChatWindow conversationId={currentConversationId} />
          </div>

          {/* FAB for mobile */}
          <AnimatePresence>
            {!sidebarOpen && isMobile && (
              <motion.button
                className="fixed bottom-6 left-6 z-30 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl flex items-center justify-center group"
                onClick={() => setSidebarOpen(true)}
                variants={floatingButtonVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                whileHover="hover"
                whileTap="tap"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)",
                  boxShadow: "0 8px 30px hsl(var(--primary) / 0.3)",
                }}
              >
                <motion.svg
                  className="w-6 h-6 transition-transform duration-200 group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </motion.svg>

                <motion.div
                  className="absolute inset-0 rounded-full bg-white/20"
                  animate={{ scale: [1, 1.1, 1], opacity: [0, 0.3, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.main>
      </motion.div>

      {/* mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            className="fixed inset-0 z-5 lg:hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)",
              backdropFilter: "blur(8px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------------- */}
      {/* Inline CSS (styled‑jsx) */}
      {/* ---------------------------------------------------------------- */}
      <style jsx>
        {`
          .bg-grid-pattern {
            background-image:
              linear-gradient(
                rgba(var(--foreground) / 0.02) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(var(--foreground) / 0.02) 1px,
                transparent 1px
              );
            background-size: 20px 20px;
            background-position:
              0 0,
              0 0;
          }

          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }

          /* Performance tweaks */
          .chat-container {
            transform: translateZ(0);
            will-change: transform;
          }

          .premium-sidebar {
            transform: translateZ(0);
            backface-visibility: hidden;
          }

          .premium-header {
            transform: translateZ(0);
            will-change: backdrop-filter;
          }

          /* Scrollbar */
          * {
            scrollbar-width: thin;
            scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
          }

          *::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          *::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 4px;
          }

          *::-webkit-scrollbar-thumb {
            background: linear-gradient(
              135deg,
              hsl(var(--muted-foreground) / 0.2) 0%,
              hsl(var(--muted-foreground) / 0.4) 100%
            );
            border-radius: 4px;
            border: 2px solid transparent;
            background-clip: content-box;
          }

          *::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(
              135deg,
              hsl(var(--muted-foreground) / 0.4) 0%,
              hsl(var(--muted-foreground) / 0.6) 100%
            );
            background-clip: content-box;
          }
        `}
      </style>
    </motion.div>
  );
}
