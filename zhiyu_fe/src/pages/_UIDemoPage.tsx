import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Tag from "@/components/ui/Tag";
import Chip from "@/components/ui/Chip";
import Badge from "@/components/ui/Badge";
import Switch from "@/components/ui/Switch";

const _UIDemoPage = () => {
  const [bio, setBio] = useState("这里是我的简介...");
  const [gender, setGender] = useState("female");
  const [tags, setTags] = useState<string[]>(["学习", "Python", "音乐"]);
  const [top, setTop] = useState(true);
  const [free, setFree] = useState(false);
  const [agree, setAgree] = useState(true);

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <h1 className="text-3xl font-bold" style={{ color: "var(--color-cocoa-deep)" }}>
        🎨 UI 原子演示
      </h1>
      <p style={{ color: "var(--color-cocoa-soft)" }}>9 个 Kawaii 风格原子组件，统一描边 + 硬阴影 + 平面卡通语言。</p>

      {/* Button */}
      <Card padding="lg">
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-cocoa-deep)" }}>Button</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">主要按钮</Button>
          <Button variant="secondary">浅蓝按钮</Button>
          <Button variant="matcha">抹茶按钮</Button>
          <Button variant="ghost">幽灵按钮</Button>
          <Button variant="danger">危险按钮</Button>
          <Button size="sm">小尺寸</Button>
          <Button size="lg">大尺寸</Button>
          <Button loading>加载中</Button>
          <Button disabled>禁用</Button>
        </div>
      </Card>

      {/* Card */}
      <div className="grid grid-cols-3 gap-4">
        <Card>默认 Card</Card>
        <Card variant="selected">selected 态（天蓝）</Card>
        <Card variant="warning">warning 态（错误/警示）</Card>
        <Card variant="translucent">translucent 半透</Card>
        <Card variant="flat">flat 小阴影</Card>
        <Card interactive>interactive 卡片（hover 抬起）</Card>
      </div>

      {/* Input + Textarea */}
      <Card padding="lg">
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-cocoa-deep)" }}>Input + Textarea</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="昵称" placeholder="请输入昵称" />
          <Input label="手机号" placeholder="请输入手机号" helper="📬 用于登录" />
          <Input label="邮箱" placeholder="邮箱" error="邮箱格式不正确" />
          <Input label="禁用" placeholder="禁用状态" disabled />
          <div className="col-span-2">
            <Textarea
              label="个人简介"
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={50}
              showCount
              helper="支持 Markdown"
            />
          </div>
        </div>
      </Card>

      {/* Select */}
      <Card padding="lg">
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-cocoa-deep)" }}>Select</h2>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="性别"
            value={gender}
            onChange={setGender}
            options={[
              { label: "女", value: "female" },
              { label: "男", value: "male" },
              { label: "保密", value: "other" }
            ]}
          />
          <Select
            label="可见性"
            value="public"
            onChange={() => {}}
            options={[
              { label: "公开", value: "public" },
              { label: "私密", value: "private" }
            ]}
          />
        </div>
      </Card>

      {/* Tag + Chip */}
      <Card padding="lg">
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-cocoa-deep)" }}>Tag + Chip</h2>
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <Tag>默认</Tag>
          <Tag variant="sky">天蓝</Tag>
          <Tag variant="matcha">抹茶</Tag>
          <Tag variant="peach">蜜桃</Tag>
          <Tag variant="warning">警告</Tag>
          <Tag variant="muted">降饱和</Tag>
          <Tag variant="outline">轮廓</Tag>
          <Tag onRemove={() => alert('remove')}>可关闭</Tag>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Chip selected>已选 chip</Chip>
          <Chip tone="sky" selected>天蓝 selected</Chip>
          <Chip tone="matcha" selected>抹茶 selected</Chip>
          <Chip tone="peach" selected>蜜桃 selected</Chip>
          <Chip>未选 chip</Chip>
          <Chip selected onRemove={() => alert('remove')}>可移除</Chip>
          <Chip disabled>禁用</Chip>
        </div>
      </Card>

      {/* Badge */}
      <Card padding="lg">
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-cocoa-deep)" }}>Badge</h2>
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <Badge>默认</Badge>
          <Badge tone="sky">天蓝</Badge>
          <Badge tone="matcha">抹茶</Badge>
          <Badge tone="peach">蜜桃</Badge>
          <Badge tone="warning">警告</Badge>
          <Badge tone="cocoa">可可</Badge>
          <Badge tone="outline">轮廓</Badge>
          <Badge size="sm">小</Badge>
          <Badge size="lg">大</Badge>
          <Badge shape="round">5</Badge>
          <Badge tone="warning" shape="round">12</Badge>
          <Badge tone="matcha" shape="round">88</Badge>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge tone="warning">置顶</Badge>
          <Badge tone="matcha">免费</Badge>
          <Badge tone="cocoa">付费</Badge>
          <Badge tone="sky">草稿</Badge>
          <Badge tone="peach">推荐</Badge>
        </div>
      </Card>

      {/* Switch */}
      <Card padding="lg">
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-cocoa-deep)" }}>Switch</h2>
        <div className="flex flex-wrap gap-6 items-center">
          <Switch checked={top} onChange={setTop} label="置顶" />
          <Switch checked={free} onChange={setFree} label="免费内容" />
          <Switch checked={agree} onChange={setAgree} label="已同意协议" />
          <Switch checked={false} onChange={() => {}} disabled label="禁用" />
        </div>
      </Card>

      {/* Tag 管理 */}
      <Card padding="lg">
        <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-cocoa-deep)" }}>Tag 管理（动态）</h2>
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map(t => (
            <Tag key={t} variant="sky" onRemove={() => setTags(tags.filter(x => x !== t))}>
              {t}
            </Tag>
          ))}
          {tags.length === 0 && <span style={{ color: "var(--color-cocoa-soft)" }}>已全部移除</span>}
        </div>
      </Card>
    </div>
  );
};

export default _UIDemoPage;