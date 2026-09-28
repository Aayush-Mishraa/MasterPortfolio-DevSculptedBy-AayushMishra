import React, { Component, createRef } from "react";
import { createPortal } from "react-dom";
import "./CommandPalette.css";

// Keyboard-first launcher: every page and social link, one search away.
class CommandPalette extends Component {
  state = {
    query: "",
    cursor: 0
  };

  inputRef = createRef();
  listRef = createRef();

  componentDidUpdate(prevProps) {
    if (this.props.open && !prevProps.open) {
      this.setState({ query: "", cursor: 0 });
      this.lastFocus = document.activeElement;
      requestAnimationFrame(() => this.inputRef.current && this.inputRef.current.focus());
    }
    if (!this.props.open && prevProps.open && this.lastFocus && this.lastFocus.focus) {
      this.lastFocus.focus();
    }
  }

  results = () => {
    const query = this.state.query.trim().toLowerCase();
    if (!query) return this.props.items;
    return this.props.items.filter((item) =>
      `${item.label} ${item.group} ${item.hint || ""}`.toLowerCase().includes(query)
    );
  }

  run = (item) => {
    if (!item) return;
    this.props.onClose();
    item.run();
  }

  moveCursor = (delta, count) => {
    if (!count) return;
    const cursor = (this.state.cursor + delta + count) % count;
    this.setState({ cursor }, () => {
      const list = this.listRef.current;
      const active = list && list.querySelector('[data-active="true"]');
      if (active) active.scrollIntoView({ block: "nearest" });
    });
  }

  handleKeyDown = (event, results) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveCursor(1, results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.moveCursor(-1, results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      this.run(results[this.state.cursor]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.props.onClose();
    }
  }

  render() {
    if (!this.props.open) return null;
    const results = this.results();
    let lastGroup = null;

    return createPortal(
      <div className="cmdk-backdrop" style={this.props.style} onMouseDown={this.props.onClose}>
        <div
          className="cmdk"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="cmdk-search">
            <span className="cmdk-prompt" aria-hidden="true">&gt;_</span>
            <input
              ref={this.inputRef}
              className="cmdk-input"
              type="text"
              placeholder="Jump to a page, project or profile…"
              value={this.state.query}
              onChange={(event) => this.setState({ query: event.target.value, cursor: 0 })}
              onKeyDown={(event) => this.handleKeyDown(event, results)}
              role="combobox"
              aria-expanded="true"
              aria-controls="cmdk-list"
              aria-activedescendant={results.length ? `cmdk-item-${this.state.cursor}` : undefined}
              spellCheck="false"
              autoComplete="off"
            />
            <kbd className="cmdk-kbd">ESC</kbd>
          </div>

          <ul className="cmdk-list" id="cmdk-list" role="listbox" ref={this.listRef} data-lenis-prevent>
            {results.length === 0 && (
              <li className="cmdk-empty">No match for “{this.state.query}”</li>
            )}
            {results.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const active = index === this.state.cursor;
              return (
                <React.Fragment key={item.id}>
                  {showGroup && (
                    <li className="cmdk-group" role="presentation">{item.group}</li>
                  )}
                  <li
                    id={`cmdk-item-${index}`}
                    className="cmdk-item"
                    role="option"
                    aria-selected={active}
                    data-active={active}
                    onMouseMove={() => !active && this.setState({ cursor: index })}
                    onClick={() => this.run(item)}
                  >
                    <span className="cmdk-icon" aria-hidden="true">
                      <i className={item.icon}></i>
                    </span>
                    <span className="cmdk-label">{item.label}</span>
                    {item.current && <span className="cmdk-tag">Current</span>}
                    {item.hint && <span className="cmdk-hint">{item.hint}</span>}
                    <span className="cmdk-enter" aria-hidden="true">↵</span>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>

          <div className="cmdk-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span className="cmdk-footer-status">
              <span className="cmdk-dot" aria-hidden="true"></span>
              {this.props.statusText}
            </span>
          </div>
        </div>
      </div>,
      document.body
    );
  }
}

export default CommandPalette;
