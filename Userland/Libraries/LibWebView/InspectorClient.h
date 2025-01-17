/*
 * Copyright (c) 2023, Tim Flynn <trflynn89@serenityos.org>
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */

#include <AK/JsonValue.h>
#include <AK/StringView.h>
#include <LibWebView/ViewImplementation.h>

#pragma once

namespace WebView {

class InspectorClient {
public:
    InspectorClient(ViewImplementation& content_web_view, ViewImplementation& inspector_web_view);
    ~InspectorClient();

    void inspect();
    void reset();

    void select_hovered_node();
    void select_default_node();
    void clear_selection();

private:
    void load_inspector();

    String generate_dom_tree(JsonObject const&);
    String generate_accessibility_tree(JsonObject const&);
    void select_node(i32 node_id);

    void request_console_messages();
    void handle_console_message(i32 message_index);
    void handle_console_messages(i32 start_index, ReadonlySpan<DeprecatedString> message_types, ReadonlySpan<DeprecatedString> messages);

    void append_console_source(StringView);
    void append_console_output(StringView);
    void clear_console_output();

    void begin_console_group(StringView label, bool start_expanded);
    void end_console_group();

    ViewImplementation& m_content_web_view;
    ViewImplementation& m_inspector_web_view;

    Optional<i32> m_body_node_id;
    Optional<i32> m_pending_selection;

    bool m_dom_tree_loaded { false };

    i32 m_highest_notified_message_index { -1 };
    i32 m_highest_received_message_index { -1 };
    bool m_waiting_for_messages { false };
};

}
