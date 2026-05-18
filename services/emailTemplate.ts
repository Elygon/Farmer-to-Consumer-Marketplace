export const BRAND = {
    primary: "#2D6A4F",     // background: linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%);
    secondary: "#F8F5EF",   // Off-white Cream
    accent: "#F4A261",      // Harvest Gold
    textDark: "#1A2E22",    // Deep Soil
    textLight: "#6B7C6E",   // Muted Green-Grey
    white: "#FFFFFF",
    border: "#D6E8DC"
}

export const buildEmailTemplate = (
    title: string,
    bodyContent: string
) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
    </head>

    <body style="
        margin:0;
        padding:0;
        background:${BRAND.secondary};
        font-family:Arial, sans-serif;
    ">

        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center" style="padding:40px 20px;">

                    <table width="100%" cellpadding="0" cellspacing="0"
                        style="
                            max-width:600px;
                            background:${BRAND.white};
                            border-radius:16px;
                            overflow:hidden;
                            border:1px solid ${BRAND.border};
                        "
                    >

                        <!-- Header -->
                        <tr>
                            <td style="
                                background:linear-gradient(135deg, ${BRAND.primary} 0%, #1B4332 100%);
                                padding:40px 30px;
                                text-align:center;
                            ">
                                <h1 style="
                                    color:white;
                                    margin:0;
                                    font-size:28px;
                                ">
                                    FarmConnect
                                </h1>

                                <p style="
                                    color:rgba(255,255,255,0.85);
                                    margin-top:10px;
                                ">
                                    Fresh from the Farm, Straight to You
                                </p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="
                                padding:40px 35px;
                                color:${BRAND.textLight};
                                font-size:16px;
                                line-height:1.7;
                            ">
                                ${bodyContent}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="
                                padding:25px;
                                text-align:center;
                                background:#fafaf7;
                                border-top:1px solid ${BRAND.border};
                            ">
                                <p style="
                                    margin:0;
                                    font-size:13px;
                                    color:#888;
                                ">
                                    © ${new Date().getFullYear()} FarmConnect Marketplace
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>

    </body>
    </html>
    `
}