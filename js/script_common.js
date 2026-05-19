var _____WB$wombat$assign$function_____=function(name){return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name))||self[name];};if(!self.__WB_pmw){self.__WB_pmw=function(obj){this.__WB_source=obj;return this;}}{
let window = _____WB$wombat$assign$function_____("window");
let self = _____WB$wombat$assign$function_____("self");
let document = _____WB$wombat$assign$function_____("document");
let location = _____WB$wombat$assign$function_____("location");
let top = _____WB$wombat$assign$function_____("top");
let parent = _____WB$wombat$assign$function_____("parent");
let frames = _____WB$wombat$assign$function_____("frames");
let opens = _____WB$wombat$assign$function_____("opens");
$(function(){
	$(".num").on("keyup", function() {
		$(this).val($(this).val().replace(/[^0-9]/g,""));
		alert('ⓘ 비밀번호는 숫자만 입력 가능합니다.');
		return false;
	});

	var inputSch= document.getElementById("q_input");
	inputSch.addEventListener("keyup", function(event) {
    		event.preventDefault();
    		if (event.keyCode === 13) 
		{
        		document.getElementById("q_btn").click();
    		}
	});
	$(".btn_search").click(function(){
		var q = $("input[name=q]").val();
		if(q=="")
		{
			//window.open("https://coupa.ng/bLEm49");
			location.href="https://myleon.co/"
		}
		else if(q.length<2)
		{
			alert('ⓘ 검색어는 최소 2자이상 입력해주세요.');
			$("input[name=q]").focus();
			return false;
		}
		else
		{
			location.href="https://myleon.co/";
		}
	});

/*
	var inputSch= document.getElementById("q_input_m");
	inputSch.addEventListener("keyup", function(event) {
    		event.preventDefault();
    		if (event.keyCode === 13) 
		{
        		document.getElementById("q_btn_m").click();
    		}
	});
	$(".btn_search_m").click(function(){
		var q = $("input[name=q_m]").val();
		if(q=="" || q.length<2)
		{
			alert('ⓘ 검색어는 최소 2자이상 입력해주세요.');
			$("input[name=q]").focus();
			return false;
		}
		location.href="/?m=sch&q="+q;
	});
*/


	/* 검색기능 2
	$(".btn_search").click(function(){
		var q = $("input[name=q]").val();
		if(q=="" || q.length<2)
		{
			alert('ⓘ 검색어는 최소 2자이상 입력해주세요.');
			$("input[name=q]").focus();
			return false;
		}
		else
		{
			$.post("/apps/sch.php",{"q":q}, function(data){
				data = $.trim(data);
				var dataArr = $.parseJSON(data);
				if(dataArr.result == "ok")
				{
					var moveUrl = "/?m=vd&bid="+dataArr.res.l_type+"&no="+dataArr.res.l_no+"&q="+q;
					location.href=moveUrl;
				}
				else
				{
					alert('ⓘ 검색결과가 없습니다.\n띄어쓰기에 유의하여 검색어를 정확히 입력해주세요.');

					return false;
				}
			});
		}
		//location.href="/apps/brd.php?m=l&q="+q;
	});
	*/
});

function addFavorite() 
{
	var title = document.title; //현재 보고 있는 페이지의 Title
	var url = location.href; //현재 보고 있는 페이지의 Url
	//Internet Explorer
	if(document.all)
	{
		window.external.AddFavorite(url, title);
	}
	//Google Chrome
	else if(window.chrome) 
	{
		alert("ⓘ Ctrl+D키를 누르시면 즐겨찾기에 추가하실 수 있습니다.");
	}
	//Firefox
	else if (window.sidebar) 
	{
		window.sidebar.addPanel(title, url, "");
	}
	//Opera
	else if(window.opera && window.print) 
	{
		var elem = document.createElement('a');
		elem.setAttribute('href',url);
		elem.setAttribute('title',title);
		elem.setAttribute('rel','sidebar');
		elem.click();
	}
}

function favAdd(lno)
{
	if(lno == "")		
	{
		//alert("ⓘ 필수인자 값을 확인하세요.");
		alert("ⓘ 로그인 후 이용 가능한 서비스입니다.\n확인 버튼을 누르시면 간편회원가입 페이지로 이동됩니다.");
		return false;
	}
	$.post("/apps/favorite.php?m=ajaxwr", {"no":lno}, function(data){
		data = $.trim(data);
		if(data == "101")
		{
			alert("ⓘ 즐겨찾는 사이트 목록에 추가 되었습니다.");
			location.reload();
			return false;
		}
		else if(data == "301")
		{
			var chkDevice = checkMobile();
			var qVal = "";
			var confTxt = "";
			if(chkDevice == "android")
			{
				qVal = getParameterByName("q");
				if(confirm("ⓘ 링크세상 어플을 무료다운받으시면 ["+qVal+"] 바로가기 서비스를 편리하게 이용하실 수 있습니다.\n확인 버튼을 누르시면 구글플레이 스토어로 이동됩니다."))
				{
					location.href="https://myleon.co/";	
					return false;
				}
				else
				{
					return false;
				}
			}
			else
			{
				if(confirm("ⓘ 로그인 후 이용 가능한 서비스입니다.\n확인 버튼을 누르시면 간편회원가입 페이지로 이동됩니다."))
				{
						location.href="https://myleon.co/";	
					return false;
				}
				else
				{
					return false;
				}
			}
		}
		else if(data == "202")	
		{
			alert("ⓘ 이미 즐겨찾기에 추가된 사이트 입니다.");
			return false;
		}
		else
		{
			alert("ⓘ 로그인 후 이용 가능한 기능입니다.");
			return false;
		}
	});
	return false;
}

function favDel(lno)
{
	if(lno == "")		
	{
		alert("ⓘ 필수인자 값을 확인하세요.");
		return false;
	}

	if(confirm("ⓘ 삭제하시겠습니까?"))
	{
		$.post("/apps/favorite.php?m=ajaxdr", {"no":lno}, function(data){
			data = $.trim(data);
			if(data == "101")
			{
				alert("ⓘ 정상적으로 삭제 되었습니다.");
				location.reload();
				return false;
			}
			else if(data == "301")
			{
				alert("ⓘ 로그인 후 이용 가능한 기능입니다.");
				return false;
			}
			else if(data == "202")	
			{
				alert("ⓘ 본인이 등록한 즐겨찾기 사이트만 삭제 가능합니다.");
				return false;
			}
			else
			{
				alert("ⓘ 필수 인자값을 확인하세요.");
				return false;
			}
		});
	}

}
function checkMobile()
{
	var varUA = navigator.userAgent.toLowerCase();
	if ( varUA.indexOf('android') > -1) 
	{
		//안드로이드
		return "android";
	} 
	else if ( varUA.indexOf("iphone") > -1||varUA.indexOf("ipad") > -1||varUA.indexOf("ipod") > -1 ) 
	{
               //IOS
               return "ios";
        } 
	else 
	{
              //아이폰, 안드로이드 외
              return "other";
	}
}

function getParameterByName(name) 
{ 
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]"); 
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search); 
	return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " ")); 
}

}

/*
     FILE ARCHIVED ON 09:22:36 Apr 27, 2024 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 18:41:50 Mar 24, 2026.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 0.974
  exclusion.robots: 0.067
  exclusion.robots.policy: 0.049
  esindex: 0.023
  cdx.remote: 68.313
  LoadShardBlock: 60.214 (3)
  PetaboxLoader3.datanode: 131.987 (5)
  load_resource: 140.793
  PetaboxLoader3.resolve: 53.185
  loaddict: 37.867
*/
