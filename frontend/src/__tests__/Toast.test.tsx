import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "../providers/ToastProvider";

function TestConsumer() {
  const { show } = useToast();
  return (
    <div>
      <button onClick={() => show({ message: "Success!", variant: "success" })}>
        Show Success
      </button>
      <button onClick={() => show({ message: "Error!", variant: "error" })}>
        Show Error
      </button>
      <button onClick={() => show({ message: "Info!", variant: "info" })}>
        Show Info
      </button>
      <button onClick={() => show({ message: "Quick!", variant: "info", duration: 1000 })}>
        Show Quick
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestConsumer />
    </ToastProvider>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a toast when triggered", () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText("Show Success"));
    });

    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("auto-dismisses after default duration", () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText("Show Info"));
    });
    expect(screen.getByText("Info!")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    expect(screen.queryByText("Info!")).not.toBeInTheDocument();
  });

  it("auto-dismisses after custom duration", () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText("Show Quick"));
    });
    expect(screen.getByText("Quick!")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.queryByText("Quick!")).not.toBeInTheDocument();
  });

  it("dismisses on click", () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText("Show Success"));
    });

    act(() => {
      fireEvent.click(screen.getByText("Success!"));
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText("Success!")).not.toBeInTheDocument();
  });

  it("stacks multiple toasts", () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText("Show Success"));
      fireEvent.click(screen.getByText("Show Error"));
      fireEvent.click(screen.getByText("Show Info"));
    });

    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("Error!")).toBeInTheDocument();
    expect(screen.getByText("Info!")).toBeInTheDocument();
  });

  it("uses role=alert for error variant", () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText("Show Error"));
    });

    expect(screen.getByText("Error!")).toHaveAttribute("role", "alert");
  });

  it("uses role=status for success variant", () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText("Show Success"));
    });

    expect(screen.getByText("Success!")).toHaveAttribute("role", "status");
  });

  it("uses role=status for info variant", () => {
    renderWithProvider();

    act(() => {
      fireEvent.click(screen.getByText("Show Info"));
    });

    expect(screen.getByText("Info!")).toHaveAttribute("role", "status");
  });

  it("throws when useToast is used outside provider", () => {
    function BadConsumer() {
      useToast();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      "useToast must be used within a ToastProvider"
    );
  });
});
