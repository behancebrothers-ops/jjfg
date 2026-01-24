import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function renderEmail(
    supabaseClient: SupabaseClient,
    templateName: string,
    variables: Record<string, string | number | undefined>
): Promise<{ subject: string; html: string }> {
    console.log(`Rendering email for template: ${templateName}`);

    // 1. Fetch the template
    const { data: template, error: templateError } = await supabaseClient
        .from("email_templates")
        .select("subject, body, layout_id")
        .eq("name", templateName)
        .single();

    if (templateError || !template) {
        console.error(`Template ${templateName} not found:`, templateError);
        throw new Error(`Email template "${templateName}" not found.`);
    }

    // 2. Fetch the layout (associated or default)
    let layoutHtml = "{{content}}";
    const { data: layout, error: layoutError } = await supabaseClient
        .from("email_layouts")
        .select("html_content")
        .eq("id", template.layout_id || "") // Try to get specific layout
        .maybeSingle();

    if (layout) {
        layoutHtml = layout.html_content;
    } else {
        // Try to get default layout if specific one missing
        const { data: defaultLayout } = await supabaseClient
            .from("email_layouts")
            .select("html_content")
            .eq("is_default", true)
            .maybeSingle();

        if (defaultLayout) {
            layoutHtml = defaultLayout.html_content;
        }
    }

    // 3. Prepare variables (add global ones)
    const allVariables = {
        ...variables,
        year: new Date().getFullYear().toString(),
        company_name: "Luxee Store",
    };

    // 4. Substitute variables in subject and body
    let subject = template.subject;
    let body = template.body;

    Object.entries(allVariables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, "g");
        const safeValue = value?.toString() || "";
        subject = subject.replace(placeholder, safeValue);
        body = body.replace(placeholder, safeValue);
    });

    // 5. Wrap body in layout
    const html = layoutHtml.replace("{{content}}", body);

    // 6. Final substitution for the layout variables (like {{year}})
    let finalHtml = html;
    Object.entries(allVariables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, "g");
        const safeValue = value?.toString() || "";
        finalHtml = finalHtml.replace(placeholder, safeValue);
    });

    return { subject, html: finalHtml };
}
