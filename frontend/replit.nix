{ pkgs }: {
  deps = [
    pkgs.bun
    pkgs.vite
    pkgs.tailwind
    pkgs.drizzle
    pkgs.jest
    pkgs.storyBook
  ];
}
