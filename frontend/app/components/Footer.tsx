"use client";

import Image from "next/image";
import { useState } from "react";

export default function Footer() {
  return (
    <footer
      id="site-footer"
      style={{
        width: "100%",
        background: "#21483d",
        borderTop: "1px solid rgba(224, 185, 72, 0.38)",
        flexShrink: 0,
      }}
    >
      {/* 主内容区 */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px 24px",
          display: "flex",
          gap: 48,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* 品牌区 */}
        <div style={{ minWidth: 200, flex: "1 1 200px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Image
              src="/images/brand/circamemo-logo.png"
              alt="CircaMemo 完整标志"
              width={48}
              height={48}
              style={{
                borderRadius: 8,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#fff8e8",
                letterSpacing: "0.04em",
              }}
            >
              忆城舆图 CircaMemo
            </span>
          </div>
          <p
            style={{
              color: "rgba(255,248,232,0.68)",
              fontSize: 12,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            中国历史文化遗产记忆地图
            <br />
            展示遗产点、历史区域与历史地图
            <br />
            记录公众记忆、意向与评价
          </p>
        </div>

        {/* 资源导航 */}
        <FooterColumn
          title="资源导航"
          links={["帮助文档", "数据下载", "工具教程"]}
        />

        {/* 关于我们 */}
        <FooterColumn
          title="关于我们"
          links={["用户协议", "隐私政策"]}
        />

        {/* 联系我们 */}
        <div style={{ minWidth: 100 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff8e8",
              marginBottom: 12,
            }}
          >
            联系我们
          </div>
          <a
            href="mailto:uki@n-dstudio.com"
            style={{
              color: "rgba(255,248,232,0.68)",
              fontSize: 13,
              lineHeight: 2,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            邮箱 uki@n-dstudio.com
          </a>
        </div>

        {/* 关注我们 */}
        <div style={{ minWidth: 120 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff8e8",
              marginBottom: 12,
            }}
          >
            关注我们
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <QrCodeTrigger
              label="微信公众号"
              src="/images/social/cityrandomwalk.jpg"
              alt="微信公众号二维码"
            />
            <a
              href="https://space.bilibili.com/3690996770539566"
              target="_blank"
              rel="noreferrer"
              style={footerLinkStyle}
            >
              Bilibili
            </a>
            <a
              href="https://weibo.com/u/5047217038"
              target="_blank"
              rel="noreferrer"
              style={footerLinkStyle}
            >
              微博
            </a>
          </div>
        </div>

        {/* 赞助我们 */}
        <div style={{ minWidth: 120 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#e47a5f",
              marginBottom: 12,
            }}
          >
            赞助我们
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <QrCodeTrigger
              label="微信支付"
              src="/images/social/wechat-donation.jpg"
              alt="微信收款码"
            />
            <QrCodeTrigger
              label="支付宝"
              src="/images/social/alipay-donation.jpg"
              alt="支付宝收款码"
            />
          </div>
        </div>
      </div>

      {/* 底部小字行 */}
      <div
        style={{
          borderTop: "1px solid rgba(224, 185, 72, 0.24)",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ color: "rgba(255,248,232,0.64)", fontSize: 12 }}>
          忆城舆图 CircaMemo · 中国历史文化遗产记忆地图 · 原型版本 v1.0
        </span>
        <span style={{ color: "rgba(255,248,232,0.48)", fontSize: 11 }}>
          数据来源：各文物部门 / 历史地图网站 / 各平台公开评论
        </span>
      </div>
    </footer>
  );
}

const footerPageLinks: Record<string, string> = {
  帮助文档: "/help",
  数据下载: "/downloads",
  工具教程: "/tutorials",
  用户协议: "/terms",
  隐私政策: "/privacy",
};

const footerLinkStyle = {
  color: "rgba(255,248,232,0.68)",
  fontSize: 13,
  lineHeight: 2,
  textDecoration: "none",
} as const;

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div style={{ minWidth: 100 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#fff8e8",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {links.map((link) => {
          const href = footerPageLinks[link];
          const style = {
            color: "rgba(255,248,232,0.68)",
            fontSize: 13,
            lineHeight: 2,
          };

          return href ? (
            <a
              key={link}
              href={href}
              style={{ ...style, textDecoration: "none" }}
            >
              {link}
            </a>
          ) : (
            <span key={link} style={{ ...style, cursor: "default" }}>
              {link}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function QrCodeTrigger({
  label,
  src,
  alt,
  size = 100,
}: {
  label: string;
  src: string;
  alt: string;
  size?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{ position: "relative", width: "fit-content" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "rgba(255,248,232,0.68)",
          fontSize: 13,
          lineHeight: 2,
          textAlign: "left",
        }}
      >
        {label}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            zIndex: 50,
            width: size + 16,
            background: "#fff",
            padding: 8,
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
          }}
        >
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            style={{
              display: "block",
              width: size,
              height: size,
              maxWidth: "none",
              objectFit: "contain",
            }}
          />
        </div>
      )}
    </div>
  );
}
