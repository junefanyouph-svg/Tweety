const fs = require('fs');
let code = fs.readFileSync('client/src/components/PostCard.jsx', 'utf8');

const targetStr = `  const handleCopyLink = () => { navigator.clipboard.writeText(\`\${window.location.origin}/post/\${post.id}\`); setToast(true); setTimeout(() => setToast(false), 2000) }`;

const renderFn = `
  const renderCommentThread = (comment, depth = 0, isLast = false) => {
    const replies = comments.filter(c => c.parent_id === comment.id);
    const isCollapsed = collapsedThreads.includes(comment.id);
    
    return (
      <div key={comment.id} className={depth === 0 ? "border-b border-border-dark relative thread-container" : 'comments-slide ml-12 py-3 bg-[#1a1d27] border-b-0 relative'} style={depth > 0 ? { paddingBottom: isLast ? '16px' : '12px' } : {}} onClick={e => e.stopPropagation()}>
        {(replies.length > 0 || replyingTo === comment.id) && (
          <div
            className={\`thread-line-stem absolute w-[2px] bg-thread z-[1] \${isCollapsed ? 'thread-replies-collapsed' : ''}\`}
            style={{ 
              left: depth === 0 ? '14px' : '18px', 
              top: depth === 0 ? '30px' : '20px', 
              bottom: (replyingTo === comment.id && replies.length === 0) ? '78px' : '48px' 
            }}
            onClick={() => toggleCollapse(comment.id)}
            title="Collapse thread"
          />
        )}
        {depth > 0 && (
          <div
            className="thread-branch-elbow absolute left-[-34px] top-[10px] w-[34px] h-[24px] border-l-2 border-b-2 border-thread rounded-bl-xl z-[1] cursor-pointer"
            onClick={() => toggleCollapse(comment.id)}
            title="Collapse thread"
          />
        )}

        <div id={\`comment-\${comment.id}\`} className={depth === 0 ? "py-4 bg-[#1a1d27] relative border-b-0" : ""} style={depth === 0 ? { paddingBottom: (replies.length > 0 || replyingTo === comment.id) ? '12px' : '16px' } : {}}>
          <div className="flex justify-between mb-1.5 items-center">
            <div className="flex items-center gap-2 relative z-[2] cursor-pointer" onClick={() => navigate(\`/profile/\${comment.username}\`)}>
              <div className={\`relative z-[2] \${depth > 0 ? 'w-8 h-8' : ''}\`}>
                {comment.profiles?.avatar_url 
                  ? <img src={comment.profiles.avatar_url} className={\`\${depth > 0 ? 'w-8 h-8' : 'w-7 h-7'} rounded-full object-cover block\`} alt="" /> 
                  : <div className={\`\${depth > 0 ? 'w-8 h-8 flex items-center justify-center text-[0.8rem]' : 'w-7 h-7 flex items-center justify-center text-[0.75rem]'} rounded-full bg-primary text-white\`}>{comment.username?.charAt(0)}</div>}
              </div>
              <div className={depth > 0 ? "flex flex-col" : ""}><span className="font-bold text-[0.85rem] text-text-main">{comment.profiles?.display_name || comment.username}</span><span className={\`text-[0.75rem] text-text-dim \${depth === 0 ? 'ml-1' : ''}\`}>@{comment.username}</span></div>
            </div>
          </div>
          <div className={depth > 0 ? "ml-10" : "ml-12"}>
            <div className={\`text-[\${depth > 0 ? '0.85rem' : '0.9rem'}] text-text-reply leading-relaxed\`}>{renderContent(comment.content, navigate)}</div>
            {comment.image_url && <img src={comment.image_url} className="mt-2 max-w-[60%] max-h-[150px] object-contain rounded-lg cursor-pointer" alt="" onClick={() => setViewingImage(comment.image_url)} />}
            <div className="flex gap-4 mt-2">
              <button className={\`bg-none border-none cursor-pointer text-[0.8rem] flex items-center gap-1 transition-colors \${comment.comment_likes?.some(l => l.user_id === user?.id) ? 'text-[#e0245e]' : 'text-text-dim'} \${animatingCommentId === comment.id ? 'heart-bounce' : ''}\`} onClick={() => handleCommentLike(comment)}>
                <i className={\`fa-\${comment.comment_likes?.some(l => l.user_id === user?.id) ? 'solid' : 'regular'} fa-heart\`}></i> <span className={comment.comment_likes?.some(l => l.user_id === user?.id) ? 'font-bold' : 'font-normal'}>{comment.comment_likes?.length || 0}</span>
              </button>
              <button className="bg-none border-none cursor-pointer text-[0.8rem] text-text-dim flex items-center gap-1 hover:text-primary transition-colors" onClick={() => {
                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                setReplyContent(comment.username === user?.username ? '' : \`@\${comment.username} \`);
                if (collapsedThreads.includes(comment.id)) {
                  toggleCollapse(comment.id);
                }
              }}><i className="fa-solid fa-reply"></i></button>
            </div>
          </div>
        </div>

        <div className={\`thread-replies-wrapper \${isCollapsed ? 'thread-replies-collapsed' : ''}\`}>
          {replyingTo === comment.id && (
            <div className="ml-12 relative bg-none border-none py-3 px-0">
              <div
                className="thread-branch-elbow absolute left-[-34px] top-[18px] w-[34px] h-[24px] border-l-2 border-b-2 border-thread rounded-bl-xl z-[1] cursor-pointer"
                onClick={() => toggleCollapse(comment.id)}
                title="Collapse thread"
              />
              <div className="pill-input-outer relative">
                <button className="circle-action-btn" onClick={() => setShowMediaMenu(showMediaMenu === comment.id ? null : comment.id)}>
                  <i className={\`fa-solid \${showMediaMenu === comment.id ? 'fa-xmark' : 'fa-plus'}\`}></i>
                </button>

                {showMediaMenu === comment.id && (
                  <div className="media-menu-popover">
                    <div className="media-menu-item" onClick={() => { commentFileRef.current.click(); setShowMediaMenu(null) }}>
                      <i className="fa-regular fa-image"></i> Image
                    </div>
                    <div className="media-menu-item" onClick={() => { setShowCommentGifPicker(comment.id); setShowMediaMenu(null) }}>
                      <i className="fa-solid fa-bolt"></i> GIF
                    </div>
                  </div>
                )}

                <div className="pill-input-container">
                  <RichTextEditor placeholder="Start a new reply..." content={replyContent} onChange={(e) => handleComposerChange(e, 'reply', comment.id)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(null, comment.id) } }} minHeight="36px" />
                  <button
                    className={\`circle-action-btn \${(replyContent.trim() || commentImage || commentGifUrl) ? 'send-btn-pop' : 'send-btn-hide'}\`}
                    style={{ flexShrink: 0, backgroundColor: '#00BFA6', color: 'white', border: 'none', pointerEvents: (replyContent.trim() || commentImage || commentGifUrl) ? 'auto' : 'none' }}
                    onClick={() => handleComment(null, comment.id)}
                  >
                    <i className="fa-solid fa-arrow-up"></i>
                  </button>
                </div>
              </div>
              {(commentImagePreview || commentGifUrl) && (
                <div className="ml-12 mt-2.5">
                  <div className="relative w-fit rounded-xl overflow-hidden border border-border-dark">
                    <img src={commentImagePreview || commentGifUrl} className="max-w-[200px] max-h-[150px] block" alt="Preview" />
                    <button
                      onClick={() => { setCommentImage(null); setCommentImagePreview(null); setCommentGifUrl(null) }}
                      className="absolute top-2 right-2 bg-black/70 text-white border-none rounded-full w-6 h-6 cursor-pointer flex items-center justify-center"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
              )}
              {showCommentGifPicker === comment.id && (
                <div className="mt-2.5">
                  <GifPicker
                    onSelect={(url) => { setCommentGifUrl(url); setShowCommentGifPicker(false) }}
                    onClose={() => setShowCommentGifPicker(null)}
                  />
                </div>
              )}
              <div className="flex gap-2 mt-2.5 ml-12">
                <button className="bg-none border-none text-text-dim py-1 px-2 text-[0.75rem] cursor-pointer hover:text-red-500 transition-colors" onClick={() => setReplyingTo(null)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="relative mt-3">
            {replies.map((reply, rIdx) => renderCommentThread(reply, depth + 1, rIdx === replies.length - 1))}
          </div>
        </div>
        
        {depth === 0 && isCollapsed && replies.length > 0 && (
          <div style={{ marginLeft: '48px', padding: '10px 0' }}>
            <div className="replies-collapsed-badge" onClick={() => toggleCollapse(comment.id)}>
              View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </div>
          </div>
        )}
      </div>
    )
  }`;


if (!code.includes('const renderCommentThread')) {
    // Inject exactly after handleCopyLink
    const targetIdx = code.indexOf(targetStr);
    if (targetIdx !== -1) {
        code = code.substring(0, targetIdx + targetStr.length) + '\n' + renderFn + '\n' + code.substring(targetIdx + targetStr.length);
        fs.writeFileSync('client/src/components/PostCard.jsx', code);
        console.log("Injected renderCommentThread perfectly.");
    } else {
        console.log("Could not find targetStr");
    }
} else {
    console.log("renderCommentThread already in code!");
}
