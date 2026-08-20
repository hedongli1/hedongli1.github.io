source "https://rubygems.org"

# 本地预览时使用与 GitHub Pages 完全一致的依赖环境
# 纯线上部署（直接 push 到 GitHub Pages）其实不需要本地跑 Jekyll，
# 这份 Gemfile 只在你「想在电脑上先预览效果」时会用到。
gem "github-pages", group: :jekyll_plugins

# Windows 本地预览时的时区兼容
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
  gem "wdm", "~> 0.1"
end