import { cn } from "#/utils/utils";
import { ChatInterfaceWrapper } from "./chat-interface-wrapper";
import { ConversationTabContent } from "../conversation-tabs/conversation-tab-content/conversation-tab-content";
import { ConversationNameWithStatus } from "../conversation-name-with-status";
import { ConversationTabs } from "../conversation-tabs/conversation-tabs";
import { ResizeHandle } from "../../../ui/resize-handle";
import { useResizablePanels } from "#/hooks/use-resizable-panels";
import {
  useBreakpoint,
  SIDEBAR_RAIL_COLLAPSE_MAX_WIDTH,
} from "#/hooks/use-breakpoint";
import { SidebarMobileMenuToggle } from "#/components/features/sidebar/sidebar-mobile-menu-toggle";

export function ConversationMain() {
  const isMobile = useBreakpoint();
  const isSidebarRailHidden = useBreakpoint(SIDEBAR_RAIL_COLLAPSE_MAX_WIDTH);

  // `leftWidth` is the main (tabbed) panel width; `rightWidth` is the chat
  // panel. On desktop both panels are always visible and only resizable — the
  // old show/hide collapse was removed, so the layout no longer reads
  // `isRightPanelShown`.
  const { leftWidth, rightWidth, isDragging, containerRef, handleMouseDown } =
    useResizablePanels({
      defaultLeftWidth: 62,
      minLeftWidth: 35,
      maxLeftWidth: 75,
      storageKey: "desktop-layout-main-width",
    });

  return (
    <div
      className={cn(
        isMobile
          ? "relative min-h-0 flex-1 flex flex-col"
          : "h-full flex flex-col overflow-hidden",
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          "flex flex-1 overflow-hidden",
          isMobile ? "flex-col" : "transition-all duration-300 ease-in-out",
        )}
        // transition toggled at runtime based on drag state
        style={
          !isMobile
            ? { transitionProperty: isDragging ? "none" : "all" }
            : undefined
        }
      >
        {/* Main tabbed panel (files/browser/terminal/…): the large area on
            desktop. Mobile opens these via the /panel route instead, so it's
            desktop-only here. */}
        {!isMobile && (
          <div
            className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
            // panel width computed at runtime by resize hook; transition
            // toggled off while dragging so the divider tracks the cursor
            style={{
              width: `${leftWidth}%`,
              transitionProperty: isDragging ? "none" : "all",
            }}
          >
            <div className="flex h-full w-full flex-col">
              <div className="flex flex-col flex-1 min-h-0 bg-[var(--oh-surface)] overflow-hidden">
                <div
                  data-testid="tabs-pane-header"
                  className="flex shrink-0 flex-col border-b border-[var(--oh-border)]"
                >
                  <ConversationTabs isPanelResizing={isDragging} />
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <ConversationTabContent />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resize Handle - desktop only; both panels are always visible. */}
        {!isMobile && (
          <ResizeHandle onMouseDown={handleMouseDown} isDragging={isDragging} />
        )}

        {/* Chat Panel - always mounted. Mobile: full-height (flex-1). Desktop:
            the resizable right column. Owns its own header (name + status). */}
        <div
          className={cn(
            "flex flex-col bg-base overflow-hidden",
            isMobile
              ? "flex-1"
              : "transition-all duration-300 ease-in-out border-l border-[var(--oh-border)]",
          )}
          // panel width computed at runtime by resize hook; transition toggled by drag state
          style={
            !isMobile
              ? {
                  width: `${rightWidth}%`,
                  transitionProperty: isDragging ? "none" : "all",
                }
              : undefined
          }
        >
          <div
            data-testid="chat-pane-header"
            className={cn(
              "flex h-10 min-h-10 shrink-0 items-center",
              isSidebarRailHidden && "gap-2 pl-2.5",
            )}
          >
            {isSidebarRailHidden ? <SidebarMobileMenuToggle /> : null}
            <div className="min-w-0 flex-1">
              <ConversationNameWithStatus />
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatInterfaceWrapper isRightPanelShown={!isMobile} />
          </div>
        </div>
      </div>
    </div>
  );
}
